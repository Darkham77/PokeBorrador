/**
 * validate_fsm_diagrams.ts
 * Auditoría FSM vs Manual: compara el diagrama Mermaid contra las constantes en TS.
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const FSM_PATH = path.join(SRC_ROOT, 'logic/battle/battleStateMachine.ts');

const sep = (c = '─', n = 60) => c.repeat(n);

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

function runAudit() {
  console.log(sep('═'));
  console.log('🔍 VALIDADOR FSM: DIAGRAMAS v7.6');
  console.log(sep('═'));

  if (!fs.existsSync(MANUAL_PATH)) return console.error('❌ Manual no encontrado:', MANUAL_PATH);
  if (!fs.existsSync(FSM_PATH)) return console.error('❌ FSM TS no encontrado:', FSM_PATH);

  const manualCode = fs.readFileSync(MANUAL_PATH, 'utf-8');
  const fsmCode = fs.readFileSync(FSM_PATH, 'utf-8');

  const { states: mermaidStates, transitions: mermaidTransitions } = parseMermaid(manualCode);
  const { allKeys: jsKeys, jsTransitions } = parseJsFsm(fsmCode);

  let errors = 0;

  console.log(`\n[CHECK 1] Nodos Mermaid -> Constantes JS (${mermaidStates.size} estados)`);
  const missing = Array.from(mermaidStates).filter(s => !jsKeys.has(s));
  if (missing.length === 0) console.log('  ✅ OK: Sincronización perfecta de estados.');
  else { missing.forEach(s => { console.log(`  ❌ FAIL: Faltante en JS: ${s}`); errors++; }); }

  console.log(`\n[CHECK 2] Transiciones Top-Level`);
  const topLevelRx = /export const BATTLE_STATES\s*=\s*\{([\s\S]*?)\}/;
  const tlm = fsmCode.match(topLevelRx);
  const topLevelJs = new Set(tlm?.[1] ? Array.from(tlm[1].matchAll(/([A-Z][A-Z0-9_]+)\s*:/g)).map(x => x[1]!) : []);

  const topTransitions = mermaidTransitions.filter(t => topLevelJs.has(t.from) && topLevelJs.has(t.to));
  topTransitions.forEach(mt => {
    const exists = jsTransitions.some(jt => jt.from === mt.from && jt.to === mt.to);
    if (!exists) { console.log(`  ❌ FAIL: Transición ${mt.from} -> ${mt.to} falta en validTransitions.`); errors++; }
  });
  if (topTransitions.length > 0 && errors === 0) console.log(`  ✅ OK: ${topTransitions.length} transiciones validadas.`);

  console.log(`\n${sep('═')}`);
  if (errors === 0) console.log('🎉 AUDITORÍA PERFECTA.');
  else { console.log(`🚨 ${errors} desalineación(es).`); process.exit(1); }
}

runAudit();
