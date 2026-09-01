/**
 * AUDITOR MAESTRO FSM v7.6 - RIGUROSIDAD QUIRÚRGICA TOTAL + DINAMISMO.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

const IMPL_SRC_ROOT = path.resolve(process.cwd(), 'src');
const IMPL_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const IMPL_FSM_PATH = path.join(IMPL_SRC_ROOT, 'logic/battle/battleStateMachine.ts');
const FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT = 'CHECK 10';
const LOG_PREVIEW_TRUNCATE_LENGTH = 60;

// ─── Descubrimiento Dinámico de Archivos ──────────────────────────────────────
import { walkSourceFiles as walk } from './_fsmParityParser.ts';

async function discoverFsmRelatedFiles() {
  const allFiles = await walk(IMPL_SRC_ROOT);
  const relevant: { path: string, content: string }[] = [];
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    if (content.includes('fsm.transition') || content.includes('isSubState') || content.includes('BATTLE_SUBSTATES') || content.includes('BATTLE_STATES')) {
      relevant.push({ path: file, content });
    }
  }
  return relevant;
}

// ─── Parsers Robustos ─────────────────────────────────────────────────────────
function parseMermaid(manualCode: string) {
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

interface FsmConstantsInfo {
  allKeys: Set<string>;
  substates: Set<string>;
  suppressedKeys: Set<string>;
  invalidSuppressionErrors: string[];
}

function parseFsmConstants(fsmCode: string): FsmConstantsInfo {
  const allKeys = new Set<string>();
  const substates = new Set<string>();
  const suppressedKeys = new Set<string>();
  const invalidSuppressionErrors: string[] = []; // no-domain

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

      // Detectar supresión en la misma línea o en la línea inmediatamente anterior
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

async function main() {
  const validator = setupValidation({
    title: 'FSM IMPLEMENTATION VALIDATOR',
    requiredFiles: [IMPL_MANUAL_PATH, IMPL_FSM_PATH]
  });

  await validator.checkFiles();

  const manualCode = await fs.readFile(IMPL_MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(IMPL_FSM_PATH, 'utf-8');
  const fileData = await discoverFsmRelatedFiles();
  
  const externalCode = fileData.filter(f => !f.path.includes('battleStateMachine.ts')).map(d => d.content).join('\n\n');
  const allCode = fileData.map(d => d.content).join('\n\n');

  const { states: mermaidStates, syncRequired } = parseMermaid(manualCode);
  const { allKeys, substates, suppressedKeys, invalidSuppressionErrors } = parseFsmConstants(fsmCode);

  const errors: string[] = [...invalidSuppressionErrors]; // no-domain
  const warnings: string[] = []; // no-domain

  // 1. Mermaid -> JS
  mermaidStates.forEach(s => {
    if (!allKeys.has(s)) {
      errors.push(`[CHECK 1] Nodo Mermaid '${s}' falta en JS.`);
    }
  });

  // 2. Uso de Constantes
  allKeys.forEach(k => {
    if (suppressedKeys.has(k)) return;
    const usageRx = new RegExp(`(?:\\.|'|")(${k})(?:'|")?`, 'g');
    if (!externalCode.match(usageRx)) {
      warnings.push(`[CHECK 2] Constante '${k}' definida pero sin uso real fuera de battleStateMachine.ts.`);
    }
  });

  // 3. Subestados (Referencias de transiciones)
  substates.forEach(s => {
    if (suppressedKeys.has(s)) return;
    const refRx = new RegExp(`(?:isSubState|fsm\\.transition|emit|SUBSTATES)\\s*\\(\\s*[^)]*${s}|['"]${s}['"]`, 'g');
    if (!externalCode.match(refRx)) {
      warnings.push(`[CHECK 3] Subestado [PENDIENTE/HUÉRFANO]: '${s}'`);
    }
  });

  // 4. Timers Ciegos
  fileData.forEach(file => {
    file.content.split('\n').forEach((line, idx) => {
      const t = line.trim();
      if (!t.includes('setTimeout') || t.startsWith('//')) return;
      const isAtomic = t.includes('await new Promise') || t.startsWith('await') || t.includes('return new Promise') || t.includes('=>');
      if (!isAtomic) {
        warnings.push(`[CHECK 4] setTimeout no atómico en ${path.basename(file.path)}:${idx + 1}: ${t.slice(0, LOG_PREVIEW_TRUNCATE_LENGTH)}`);
      }
    });
  });

  // 5. Sincronización Mandatoria (await)
  syncRequired.forEach(sub => {
    const usageRx = new RegExp(`(?:\\.|'|")(${sub})(?:'|")?`, 'g');
    let um: RegExpExecArray | null;
    let found = false; let unawaited = false;
const FSM_CONTEXT_SLICE_CHARS = 300

    while ((um = usageRx.exec(allCode)) !== null) {
      const idx = um.index;
      const context = allCode.slice(Math.max(0, idx - FSM_CONTEXT_SLICE_CHARS), idx);
      if (context.includes(`${sub}:`) || context.includes('//')) continue;
      found = true;
      if (!context.includes('await')) unawaited = true;
    }
    if (found && unawaited) {
      warnings.push(`[CHECK 5] '${sub}' exige await según manual.`);
    }
  });

  // 6. Guardas de Idempotencia
  ['isProcessing', 'handleFaint', 'faintedSides'].forEach(g => {
    if (!allCode.includes(g)) {
      errors.push(`[CHECK 6] Falta guarda de idempotencia '${g}'`);
    }
  });

  // 7. Regla de Asientos (HUD)
  const seatRuleRx = /!s\?\.enemy\s*&&\s*!s\?\._initialEnemy|!battleStore\.state\.enemy|battleStore\.state\.enemy\s*===\s*null|!battleStore\.state\?\.enemy|!s\?\.enemy/;
  if (!seatRuleRx.test(allCode)) {
    errors.push(`[CHECK 7] No se detecta la regla de asientos para visibilidad HUD.`);
  }

  // 8. Ciclo Level Up
  if (!(allCode.includes('levelUpPokemon') && allCode.includes('CHECK_PENDING') && allCode.includes('pendingMoves'))) {
    errors.push(`[CHECK 8] Ciclo de Level Up desalineado (falta levelUpPokemon, CHECK_PENDING o pendingMoves).`);
  }

  // 9. Persistencia
  if (!(allCode.includes('persistenceMode') && (allCode.includes("'SINGLE'") || allCode.includes('"SINGLE"')))) {
    errors.push(`[CHECK 9] Rama persistenceMode SINGLE no detectada en código.`);
  }

  // 10. Referencias a Estados/Subestados Inexistentes (Código Basura)
  fileData.forEach(file => {
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      // 10a. Referencias explícitas por objeto BATTLE_STATES/BATTLE_SUBSTATES
      const explicitMatches = line.matchAll(/\bBATTLE_(?:SUB)?STATES\.([A-Z0-9_]+)\b/g);
      for (const match of explicitMatches) {
        const stateName = match[1];
        if (stateName && !allKeys.has(stateName)) {
          errors.push(`[${FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT}] Referencia explícita a estado inexistente en ${path.basename(file.path)}:${idx + 1}: BATTLE_(SUB)STATES.${stateName}`);
        }
      }

      // 10b. Literales de texto en llamadas a FSM
      const fsmCallMatches = line.matchAll(/(?:transition|isSubState|isState|currentState\.value\s*===\s*|currentState\s*===\s*|state\s*===\s*)\(\s*(?:[^,]+,\s*)?['"]([A-Z0-9_]+)['"]/g);
      for (const match of fsmCallMatches) {
        const stateName = match[1];
        if (stateName && !allKeys.has(stateName) && !['SINGLE', 'PLAYER', 'ENEMY', 'ACTIVE'].includes(stateName)) {
          errors.push(`[${FSM_AUDIT_CHECK_INDEX_TEN_LABEL_TEXT}] Literal de FSM inexistente referenciado en ${path.basename(file.path)}:${idx + 1}: '${stateName}'`);
        }
      }
    });
  });

  await validator.finish(
    {
      'Archivos escaneados': fileData.length,
      'Estados Mermaid': mermaidStates.size,
      'Constantes FSM': allKeys.size,
      'Subestados': substates.size
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
