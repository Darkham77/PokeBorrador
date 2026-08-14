// fallow-ignore-file security-sink
/**
 * validate_fsm_diagrams.ts
 * Auditoría FSM vs Manual: compara el diagrama Mermaid contra las constantes en TS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../lib/validationBase.ts';

enableCompileCache();

const DIAGRAM_SRC_ROOT = path.resolve(process.cwd(), 'src');
const DIAGRAM_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const DIAGRAM_FSM_PATH = path.join(DIAGRAM_SRC_ROOT, 'logic/battle/battleStateMachine.ts');

function parseMermaid(manualCode: string) {
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

function parseJsFsm(fsmCode: string) {
  const allKeys = new Set<string>();
  const objRx = /export const (BATTLE_(?:SUB)?STATES)\s*=\s*\{([\s\S]*?)\}\s*(as const)?\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km: RegExpExecArray | null;
    while ((km = keyRx.exec(m[2]!)) !== null) if (km?.[1]) allKeys.add(km[1]);
  }

  const jsTransitions: { from: string; to: string }[] = []; 
  const vtBlock = fsmCode.match(/const validTransitions\s*:\s*Record<string,\s*string\[\]>\s*=\s*\{([\s\S]*?)\}/);
  if (vtBlock?.[1]) {
    const rowRx = /\[BATTLE_STATES\.([A-Z0-9_]+)\]\s*:\s*\[([^\]]+)\]/g;
    let row: RegExpExecArray | null;
    while ((row = rowRx.exec(vtBlock[1])) !== null) {
      if (row?.[1] && row[2]) {
        const from = row[1];
        const toAll = Array.from(row[2].matchAll(/BATTLE_STATES\.([A-Z0-9_]+)/g)).map(x => x[1]!);
        toAll.forEach(to => jsTransitions.push({ from, to }));
      }
    }
  }
  return { allKeys, jsTransitions };
}

async function main() {
  const validator = setupValidation({
    title: 'FSM DIAGRAMS VALIDATOR',
    requiredFiles: [DIAGRAM_MANUAL_PATH, DIAGRAM_FSM_PATH]
  });

  await validator.checkFiles();

  const manualCode = await fs.readFile(DIAGRAM_MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(DIAGRAM_FSM_PATH, 'utf-8');

  const { states: mermaidStates, transitions: mermaidTransitions } = parseMermaid(manualCode);
  const { allKeys: jsKeys, jsTransitions } = parseJsFsm(fsmCode);

  const errors: string[] = [];
  const warnings: string[] = [];

  // [CHECK 1] Nodos Mermaid -> Constantes JS
  const missing = Array.from(mermaidStates).filter(s => !jsKeys.has(s));
  missing.forEach(s => {
    errors.push(`Faltante en JS: ${s}`);
  });

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
  undocumented.forEach(s => {
    errors.push(`Código basura / Indocumentado en JS: ${s} (No existe en los diagramas Mermaid del manual)`);
  });

  // [CHECK 2] Transiciones Top-Level
  const topLevelRx = /export const BATTLE_STATES\s*=\s*\{([\s\S]*?)\}/;
  const tlm = fsmCode.match(topLevelRx);
  const topLevelJs = new Set(tlm?.[1] ? Array.from(tlm[1].matchAll(/([A-Z][A-Z0-9_]+)\s*:/g)).map(x => x[1]!) : []);

  const topTransitions = mermaidTransitions.filter(t => topLevelJs.has(t.from) && topLevelJs.has(t.to));
  topTransitions.forEach(mt => {
    const exists = jsTransitions.some(jt => jt.from === mt.from && jt.to === mt.to);
    if (!exists) {
      errors.push(`Transición ${mt.from} -> ${mt.to} falta en validTransitions.`);
    }
  });

  await validator.finish(
    {
      'Mermaid states': mermaidStates.size,
      'Mermaid transitions': mermaidTransitions.length,
      'JS Keys': jsKeys.size,
      'JS Transitions': jsTransitions.length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
