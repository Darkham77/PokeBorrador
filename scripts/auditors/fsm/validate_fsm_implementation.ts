/**
 * AUDITOR MAESTRO FSM v7.6 - RIGUROSIDAD QUIRÚRGICA TOTAL + DINAMISMO.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { collectFsmFiles } from './_fsmParityParser.ts';

enableCompileCache();

const IMPL_SRC_ROOT = path.resolve(process.cwd(), 'src');
const IMPL_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const IMPL_FSM_PATH = path.join(IMPL_SRC_ROOT, 'logic/battle/battleStateMachine.ts');
const FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT = 'CHECK 10';
const LOG_PREVIEW_TRUNCATE_LENGTH = 60;

export async function discoverFsmRelatedFiles() {
  const allFiles = collectFsmFiles(IMPL_SRC_ROOT);
  const relevant: { path: string, content: string }[] = [];
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    if (content.includes('fsm.transition') || content.includes('isSubState') || content.includes('BATTLE_SUBSTATES') || content.includes('BATTLE_STATES') || content.includes('battleStore.fsm')) {
      relevant.push({ path: file, content });
    }
  }
  return relevant;
}

export function parseMermaid(manualCode: string) {
  const states = new Set<string>();
  const syncRequired = new Set<string>();
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = blockRx.exec(manualCode)) !== null) {
    const block = m[1] || '';
    if (!block.includes('stateDiagram-v2')) continue;
    block.split('\n').forEach(line => {
      const clean = line.trim();
      if (!clean || clean.startsWith('note') || clean.startsWith('%%') || clean.startsWith('[*]')) return;
      const defMatch = clean.match(/state\s+(?:"[^"]*"\s+as\s+)?([A-Za-z0-9_]+)/);
      if (defMatch?.[1]) states.add(defMatch[1]);
      const transMatch = clean.match(/^([A-Za-z0-9_]+)\s+-->\s+([A-Za-z0-9_]+)/);
      if (transMatch) {
        if (transMatch[1] && transMatch[1] !== '[*]') states.add(transMatch[1]);
        if (transMatch[2] && transMatch[2] !== '[*]') states.add(transMatch[2]);
      }
      if (clean.includes('note') && (clean.includes('await') || clean.includes('sync'))) {
        const target = clean.match(/of\s+([A-Za-z0-9_]+)/);
        if (target?.[1]) syncRequired.add(target[1]);
      }
    });
  }
  return { states, syncRequired };
}

export interface FsmConstantsInfo {
  allKeys: Set<string>;
  substates: Set<string>;
  suppressedKeys: Set<string>;
  invalidSuppressionErrors: string[];
}

export function parseFsmConstants(fsmCode: string): FsmConstantsInfo {
  const allKeys = new Set<string>();
  const substates = new Set<string>();
  const suppressedKeys = new Set<string>();
  const invalidSuppressionErrors: string[] = [];

  const lines = fsmCode.split('\n');
  let currentBlock: 'TOP' | 'SUB' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes('export const BATTLE_STATES =')) {
      currentBlock = 'TOP';
      continue;
    } else if (line.includes('export const BATTLE_SUBSTATES =')) {
      currentBlock = 'SUB';
      continue;
    } else if (currentBlock && line.includes('} as const;')) {
      currentBlock = null;
      continue;
    }

    if (!currentBlock) continue;

    const keyMatch = line.match(/^\s*([A-Z][A-Z0-9_]+)\s*:/);
    if (keyMatch && keyMatch[1]) {
      const key = keyMatch[1];
      allKeys.add(key);
      if (currentBlock === 'SUB') {
        substates.add(key);
      }

      const sameLineComment = line.includes('fsm-unused-ok') || line.includes('fsm-ignore');
      const prevLineComment = i > 0 && (lines[i - 1]!.includes('fsm-unused-ok') || lines[i - 1]!.includes('fsm-ignore'));
      const commentLine = sameLineComment ? line : (prevLineComment ? lines[i - 1]! : '');

      if (commentLine) {
        const match = commentLine.match(/(?:fsm-unused-ok|fsm-ignore)\s*(?::\s*(.*))?$/);
        const reason = match && match[1] ? match[1].trim() : '';
        const MIN_SUPPRESSION_REASON_LENGTH = 5;
        if (!reason || reason.length < MIN_SUPPRESSION_REASON_LENGTH) {
          invalidSuppressionErrors.push(`[CHECK 2] Supresión inválida para '${key}': Se requiere un comentario explicando el motivo técnico (ej. // fsm-unused-ok: motivo técnico).`);
        } else {
          suppressedKeys.add(key);
        }
      }
    }
  }

  return { allKeys, substates, suppressedKeys, invalidSuppressionErrors };
}

export type FsmImplementationRuleId =
  | 'fsm-mermaid-missing-in-js'
  | 'fsm-unused-constant'
  | 'fsm-orphan-substate'
  | 'fsm-non-atomic-timer'
  | 'fsm-unawaited-substate'
  | 'fsm-missing-idempotency-guard'
  | 'fsm-missing-seat-rule'
  | 'fsm-missing-level-up-cycle'
  | 'fsm-missing-persistence-mode'
  | 'fsm-nonexistent-state-reference'
  | 'fsm-invalid-suppression';

export const FSM_IMPLEMENTATION_RULES: readonly FsmImplementationRuleId[] = [
  'fsm-mermaid-missing-in-js',
  'fsm-unused-constant',
  'fsm-orphan-substate',
  'fsm-non-atomic-timer',
  'fsm-unawaited-substate',
  'fsm-missing-idempotency-guard',
  'fsm-missing-seat-rule',
  'fsm-missing-level-up-cycle',
  'fsm-missing-persistence-mode',
  'fsm-nonexistent-state-reference',
  'fsm-invalid-suppression'
] as const;

export class FsmImplementationAuditor extends BaseAuditor<FsmImplementationRuleId> {
  constructor() {
    super({
      id: 'validate_fsm_implementation',
      name: 'FSM Implementation Validator',
      description: 'Fallas de implementación, idempotencia o asientos en FSM',
      family: 'fsm',
      ruleIds: FSM_IMPLEMENTATION_RULES,
      ruleDescriptions: {
        'fsm-mermaid-missing-in-js': 'Estado de FSM Mermaid no implementado en código',
        'fsm-missing-idempotency-guard': 'Falta guarda de idempotencia en transición',
        'fsm-missing-seat-rule': 'Falta regla de asiento en resolución de combate',
        'fsm-missing-level-up-cycle': 'Falta ciclo de subida de nivel en batalla',
        'fsm-missing-persistence-mode': 'Modo de combate sin persistencia asociada',
        'fsm-nonexistent-state-reference': 'Referencia a estado inexistente de FSM',
        'fsm-invalid-suppression': 'Comentario de supresión FSM inválido'
      },
      requiredFiles: [IMPL_MANUAL_PATH, IMPL_FSM_PATH]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 3, 'Parsing Mermaid diagrams and FSM constants...');
    const manualCode = await fs.readFile(IMPL_MANUAL_PATH, 'utf-8');
    const fsmCode = await fs.readFile(IMPL_FSM_PATH, 'utf-8');
    const fileData = await discoverFsmRelatedFiles();
    this.filesScannedCount = fileData.length;

    const externalCode = fileData.filter(f => !f.path.includes('battleStateMachine.ts')).map(d => d.content).join('\n\n');
    const allCode = fileData.map(d => d.content).join('\n\n');

    const { states: mermaidStates, syncRequired } = parseMermaid(manualCode);
    const { allKeys, substates, suppressedKeys, invalidSuppressionErrors } = parseFsmConstants(fsmCode);

    for (const err of invalidSuppressionErrors) {
      this.addViolation({
        ruleId: 'fsm-invalid-suppression',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: err,
        context: err
      });
    }

    this.context.logStep(2, 3, 'Validating state coverage, constants, and substate usage...');
    // 1. Mermaid -> JS
    mermaidStates.forEach(s => {
      if (!allKeys.has(s)) {
        this.addViolation({
          ruleId: 'fsm-mermaid-missing-in-js',
          severity: 'error',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `[CHECK 1] Nodo Mermaid '${s}' falta en JS.`,
          context: s
        });
      }
    });

    // 2. Uso de Constantes
    allKeys.forEach(k => {
      if (suppressedKeys.has(k)) return;
      const usageRx = new RegExp(`(?:\\.|'|")(${k})(?:'|")?`, 'g');
      if (!externalCode.match(usageRx)) {
        this.addViolation({
          ruleId: 'fsm-unused-constant',
          severity: 'warning',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `[CHECK 2] Constante '${k}' definida pero sin uso real fuera de battleStateMachine.ts.`,
          context: k
        });
      }
    });

    // 3. Subestados (Referencias de transiciones)
    substates.forEach(s => {
      if (suppressedKeys.has(s)) return;
      const refRx = new RegExp(`(?:isSubState|fsm\\.transition|emit|SUBSTATES)\\s*\\(\\s*[^)]*${s}|['"]${s}['"]`, 'g');
      if (!externalCode.match(refRx)) {
        this.addViolation({
          ruleId: 'fsm-orphan-substate',
          severity: 'warning',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `[CHECK 3] Subestado [PENDIENTE/HUÉRFANO]: '${s}'`,
          context: s
        });
      }
    });

    // 4. Timers Ciegos
    fileData.forEach(file => {
      file.content.split('\n').forEach((line, idx) => {
        const t = line.trim();
        if (!t.includes('setTimeout') || t.startsWith('//')) return;
        const isAtomic = t.includes('await new Promise') || t.startsWith('await') || t.includes('return new Promise') || t.includes('=>');
        if (!isAtomic) {
          this.addViolation({
            ruleId: 'fsm-non-atomic-timer',
            severity: 'warning',
            file: path.relative(process.cwd(), file.path).replace(/\\/g, '/'),
            line: idx + 1,
            message: `[CHECK 4] setTimeout no atómico en ${path.basename(file.path)}:${idx + 1}: ${t.slice(0, LOG_PREVIEW_TRUNCATE_LENGTH)}`,
            context: t
          });
        }
      });
    });

    // 5. Sincronización Mandatoria (await)
    const FSM_CONTEXT_SLICE_CHARS = 300;
    syncRequired.forEach(sub => {
      const usageRx = new RegExp(`(?:\\.|'|")(${sub})(?:'|")?`, 'g');
      let um: RegExpExecArray | null;
      let found = false;
      let unawaited = false;

      while ((um = usageRx.exec(allCode)) !== null) {
        const idx = um.index;
        const context = allCode.slice(Math.max(0, idx - FSM_CONTEXT_SLICE_CHARS), idx);
        if (context.includes(`${sub}:`) || context.includes('//')) continue;
        found = true;
        if (!context.includes('await')) unawaited = true;
      }
      if (found && unawaited) {
        this.addViolation({
          ruleId: 'fsm-unawaited-substate',
          severity: 'warning',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `[CHECK 5] '${sub}' exige await según manual.`,
          context: sub
        });
      }
    });

    this.context.logStep(3, 3, 'Validating idempotency, seat rules, and state references...');
    // 6. Guardas de Idempotencia
    ['isProcessing', 'handleFaint', 'faintedSides'].forEach(g => {
      if (!allCode.includes(g)) {
        this.addViolation({
          ruleId: 'fsm-missing-idempotency-guard',
          severity: 'error',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `[CHECK 6] Falta guarda de idempotencia '${g}'`,
          context: g
        });
      }
    });

    // 7. Regla de Asientos (HUD)
    const seatRuleRx = /!s\?\.enemy\s*&&\s*!s\?\._initialEnemy|!battleStore\.state\.enemy|battleStore\.state\.enemy\s*===\s*null|!battleStore\.state\?\.enemy|!s\?\.enemy/;
    if (!seatRuleRx.test(allCode)) {
      this.addViolation({
        ruleId: 'fsm-missing-seat-rule',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: `[CHECK 7] No se detecta la regla de asientos para visibilidad HUD.`,
        context: 'seatRule'
      });
    }

    // 8. Ciclo Level Up
    if (!(allCode.includes('levelUpPokemon') && allCode.includes('CHECK_PENDING') && allCode.includes('pendingMoves'))) {
      this.addViolation({
        ruleId: 'fsm-missing-level-up-cycle',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: `[CHECK 8] Ciclo de Level Up desalineado (falta levelUpPokemon, CHECK_PENDING o pendingMoves).`,
        context: 'levelUp'
      });
    }

    // 9. Persistencia
    if (!(allCode.includes('persistenceMode') && (allCode.includes("'SINGLE'") || allCode.includes('"SINGLE"')))) {
      this.addViolation({
        ruleId: 'fsm-missing-persistence-mode',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: `[CHECK 9] Rama persistenceMode SINGLE no detectada en código.`,
        context: 'SINGLE'
      });
    }

    // 10. Referencias a Estados/Subestados Inexistentes (Código Basura)
    fileData.forEach(file => {
      const lines = file.content.split('\n');
      const relFile = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      lines.forEach((line, idx) => {
        // 10a. Referencias explícitas por objeto BATTLE_STATES/BATTLE_SUBSTATES
        const explicitMatches = line.matchAll(/\bBATTLE_(?:SUB)?STATES\.([A-Z0-9_]+)\b/g);
        for (const match of explicitMatches) {
          const stateName = match[1];
          if (stateName && !allKeys.has(stateName)) {
            this.addViolation({
              ruleId: 'fsm-nonexistent-state-reference',
              severity: 'error',
              file: relFile,
              line: idx + 1,
              message: `[${FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT}] Referencia explícita a estado inexistente en ${path.basename(file.path)}:${idx + 1}: BATTLE_(SUB)STATES.${stateName}`,
              context: `BATTLE_(SUB)STATES.${stateName}`
            });
          }
        }

        // 10b. Literales de texto en llamadas a FSM
        const fsmCallMatches = line.matchAll(/(?:transition|isSubState|isState|currentState\.value\s*===\s*|currentState\s*===\s*|state\s*===\s*)\(\s*(?:[^,]+,\s*)?['"]([A-Z0-9_]+)['"]/g);
        for (const match of fsmCallMatches) {
          const stateName = match[1];
          if (stateName && !allKeys.has(stateName) && !['SINGLE', 'PLAYER', 'ENEMY', 'ACTIVE'].includes(stateName)) {
            this.addViolation({
              ruleId: 'fsm-nonexistent-state-reference',
              severity: 'error',
              file: relFile,
              line: idx + 1,
              message: `[${FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT}] Literal de FSM inexistente referenciado en ${path.basename(file.path)}:${idx + 1}: '${stateName}'`,
              context: stateName
            });
          }
        }
      });
    });

    this.context.setMetric('Files scanned', fileData.length);
    this.context.setMetric('Mermaid states', mermaidStates.size);
    this.context.setMetric('FSM constants', allKeys.size);
    this.context.setMetric('Substates', substates.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new FsmImplementationAuditor());
}
