/**
 * validate_fsm_diagrams.ts
 * Auditoría FSM vs Manual: compara el diagrama Mermaid contra las constantes en TS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

const DIAGRAM_SRC_ROOT = path.resolve(process.cwd(), 'src');
const DIAGRAM_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const DIAGRAM_FSM_PATH = path.join(DIAGRAM_SRC_ROOT, 'logic/battle/battleStateMachine.ts');

export function parseMermaid(manualCode: string) {
  const states = new Set<string>();
  const transitions: { from: string; to: string }[] = []; 

  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRx.exec(manualCode)) !== null) {
    const block = blockMatch[1] || '';
    if (!block.includes('stateDiagram-v2')) continue;

    block.split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('note') || line.startsWith('%%')) return;

      const aliasM = line.match(/^state\s+"[^"]*"\s+as\s+([A-Za-z0-9_]+)/);
      if (aliasM?.[1]) { states.add(aliasM[1]); return; }

      const stateM = line.match(/^state\s+([A-Za-z0-9_]+)/);
      if (stateM?.[1]) { states.add(stateM[1]); }

      const transM = line.match(/^([A-Za-z0-9_[\]*]+)\s+-->\s+([A-Za-z0-9_[\]*]+)/);
      if (transM?.[1] && transM[2]) {
        const from = transM[1] === '[*]' ? '__START__' : transM[1];
        const to = transM[2] === '[*]' ? '__END__' : transM[2];
        states.add(from); states.add(to);
        if (from !== '__START__' && to !== '__END__') transitions.push({ from, to });
      }
    });
  }

  ['__START__', '__END__', 'choice'].forEach(s => states.delete(s));
  return { states, transitions };
}

export function parseJsFsm(fsmCode: string) {
  const allKeys = new Set<string>();
  const objRx = /export const (BATTLE_(?:SUB)?STATES)\s*=\s*\{([\s\S]*?)\}\s*(as const)?\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km: RegExpExecArray | null;
    while ((km = keyRx.exec(m[2]!)) !== null) if (km?.[1]) allKeys.add(km[1]);
  }

  const jsTransitions: { from: string; to: string }[] = []; 
  const vtBlock = fsmCode.match(/const validTransitions\s*:\s*Record<string,\s*(?:string\[\]|ReadonlySet<string>|Set<string>)>?\s*=\s*\{([\s\S]*?)\};/);
  if (vtBlock?.[1]) {
    const rowRx = /\[(?:BATTLE_STATES|BATTLE_SUBSTATES)\.([A-Z0-9_]+)\]\s*:\s*(?:new Set\()?\[([^\]]+)\]\)?/g;
    let row: RegExpExecArray | null;
    while ((row = rowRx.exec(vtBlock[1])) !== null) {
      if (row?.[1] && row[2]) {
        const from = row[1];
        const toAll = Array.from(row[2].matchAll(/(?:BATTLE_STATES|BATTLE_SUBSTATES)\.([A-Z0-9_]+)/g)).map(x => x[1]!);
        toAll.forEach(to => jsTransitions.push({ from, to }));
      }
    }
  }
  return { allKeys, jsTransitions };
}

export type FsmDiagramRuleId =
  | 'fsm-state-missing-in-js'
  | 'fsm-undocumented-js-state'
  | 'fsm-transition-missing-in-js';

export const FSM_DIAGRAM_RULES: readonly FsmDiagramRuleId[] = [
  'fsm-state-missing-in-js',
  'fsm-undocumented-js-state',
  'fsm-transition-missing-in-js'
] as const;

export class FsmDiagramAuditor extends BaseAuditor<FsmDiagramRuleId> {
  constructor() {
    super({
      id: 'validate_fsm_diagrams',
      name: 'FSM Diagrams Validator',
      description: 'Estados o transiciones de FSM discrepantes con Mermaid',
      family: 'fsm',
      ruleIds: FSM_DIAGRAM_RULES,
      ruleDescriptions: {
        'fsm-state-missing-in-js': 'Estado de Mermaid no definido en TypeScript',
        'fsm-undocumented-js-state': 'Estado en TypeScript no documentado en Mermaid',
        'fsm-transition-missing-in-js': 'Transición de Mermaid ausente en TypeScript'
      },
      requiredFiles: [DIAGRAM_MANUAL_PATH, DIAGRAM_FSM_PATH]
    });
  }

  public override async runAudit(): Promise<void> {
    const manualCode = await fs.readFile(DIAGRAM_MANUAL_PATH, 'utf-8');
    const fsmCode = await fs.readFile(DIAGRAM_FSM_PATH, 'utf-8');
    this.filesScannedCount = 2;

    const { states: mermaidStates, transitions: mermaidTransitions } = parseMermaid(manualCode);
    const { allKeys: jsKeys, jsTransitions } = parseJsFsm(fsmCode);

    this.context.logStep(1, 2, `Comparando ${mermaidStates.size} estados Mermaid del manual contra constantes JS...`);
    // [CHECK 1] Nodos Mermaid -> Constantes JS
    const missing = Array.from(mermaidStates).filter(s => !jsKeys.has(s));
    for (const s of missing) {
      this.addViolation({
        ruleId: 'fsm-state-missing-in-js',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: `Faltante en JS: ${s}`,
        context: s
      });
    }

    this.context.logStep(2, 2, `Auditando ${mermaidTransitions.length} transiciones Mermaid contra validTransitions en JS...`);

    // [CHECK 3] Constantes JS -> Nodos Mermaid (Búsqueda de Código Basura)
    const IGNORED_JS_STATES = new Set([
      'FIRST_INTRO',
      'EXEC_TURN',
      'ANIM_SYNC',
      'WAIT_LOG_QUEUE',
      'PRELOAD_COORDS',
      'PRELOAD_FINAL_COORDS',
      'PARALLEL_PREP',
      'PARALLEL_ENTRY',
      'VACATE_ALL_SEATS',
      'WAIT_TIMER',
      'ESCAPE_PROCESS',
      'BUILD_QUEUE',
      'POP_ACTION'
    ]);

    const undocumented = Array.from(jsKeys).filter(s => !mermaidStates.has(s) && !IGNORED_JS_STATES.has(s));
    for (const s of undocumented) {
      this.addViolation({
        ruleId: 'fsm-undocumented-js-state',
        severity: 'error',
        file: 'src/logic/battle/battleStateMachine.ts',
        line: 1,
        message: `Código basura / Indocumentado en JS: ${s} (No existe en los diagramas Mermaid del manual)`,
        context: s
      });
    }

    // [CHECK 2] Transiciones Top-Level
    const topLevelRx = /export const BATTLE_STATES\s*=\s*\{([\s\S]*?)\}/;
    const tlm = fsmCode.match(topLevelRx);
    const topLevelJs = new Set(tlm?.[1] ? Array.from(tlm[1].matchAll(/([A-Z][A-Z0-9_]+)\s*:/g)).map(x => x[1]!) : []);

    const topTransitions = mermaidTransitions.filter(t => topLevelJs.has(t.from) && topLevelJs.has(t.to));
    for (const mt of topTransitions) {
      const exists = jsTransitions.some(jt => jt.from === mt.from && jt.to === mt.to);
      if (!exists) {
        this.addViolation({
          ruleId: 'fsm-transition-missing-in-js',
          severity: 'error',
          file: 'src/logic/battle/battleStateMachine.ts',
          line: 1,
          message: `Transición ${mt.from} -> ${mt.to} falta en validTransitions.`,
          context: `${mt.from} -> ${mt.to}`
        });
      }
    }

    this.context.setMetric('Mermaid states', mermaidStates.size);
    this.context.setMetric('Mermaid transitions', mermaidTransitions.length);
    this.context.setMetric('JS Keys', jsKeys.size);
    this.context.setMetric('JS Transitions', jsTransitions.length);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new FsmDiagramAuditor());
}
