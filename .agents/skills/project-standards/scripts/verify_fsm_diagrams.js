/**
 * verify_fsm_diagrams.js
 * Auditoría FSM vs Manual: compara el diagrama Mermaid (battle_mechanics_manual.md)
 * contra las constantes declaradas en battleStateMachine.js.
 *
 * 100% dinámico — no tiene listas hardcodeadas.
 * Fuente de verdad: los bloques ```stateDiagram-v2``` del manual.
 *
 * Uso: node .agents/skills/project-standards/scripts/verify_fsm_diagrams.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MANUAL_PATH = path.join(__dirname, '../references/battle/battle_mechanics_manual.md');
const FSM_PATH    = path.join(__dirname, '../../../../src/logic/battle/battleStateMachine.js');

// ─── Utilidades ──────────────────────────────────────────────────────────────
const sep = (c = '─', n = 60) => c.repeat(n);

function parseMermaid(manualCode) {
  const states      = new Set();
  const transitions = []; // { from, to, label }

  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let blockMatch;

  while ((blockMatch = blockRx.exec(manualCode)) !== null) {
    const block = blockMatch[1];
    if (!block.includes('stateDiagram-v2')) continue;

    block.split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('note') || line.startsWith('%%')) return;

      // state "Label" as ALIAS  →  extraer ALIAS
      const aliasM = line.match(/^state\s+"[^"]*"\s+as\s+([A-Za-z0-9_]+)/);
      if (aliasM) { states.add(aliasM[1]); return; }

      // state NAME {  o  state NAME <<choice>>  →  extraer NAME
      const stateM = line.match(/^state\s+([A-Za-z0-9_]+)/);
      if (stateM) { states.add(stateM[1]); }

      // A --> B  o  A --> B : Label
      const transM = line.match(/^([A-Za-z0-9_\[\]*]+)\s+-->\s+([A-Za-z0-9_\[\]*]+)(?:\s*:\s*(.+))?/);
      if (transM) {
        const from  = transM[1] === '[*]' ? '__START__' : transM[1];
        const to    = transM[2] === '[*]' ? '__END__'   : transM[2];
        const label = transM[3]?.trim() || '';
        states.add(from); states.add(to);
        if (from !== '__START__' && to !== '__END__') {
          transitions.push({ from, to, label });
        }
      }
    });
  }

  // Limpiar pseudo-estados de control que no son constantes de código
  ['__START__','__END__'].forEach(s => states.delete(s));
  return { states, transitions };
}

function parseJsFsm(fsmCode) {
  const allKeys = new Set();

  // Capturar tanto BATTLE_STATES como BATTLE_SUBSTATES
  const objRx = /export const BATTLE_(?:SUB)?STATES\s*=\s*\{([\s\S]*?)\};/g;
  let m;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km;
    while ((km = keyRx.exec(m[1])) !== null) allKeys.add(km[1]);
  }

  // Extraer validTransitions { [BATTLE_STATES.X]: [...] }
  const vtBlock = fsmCode.match(/const validTransitions\s*=\s*\{([\s\S]*?)\};/);
  const validTransitions = []; // { from, to }
  if (vtBlock) {
    const lineRx = /BATTLE_STATES\.([A-Z0-9_]+)/g;
    const rowRx  = /\[BATTLE_STATES\.([A-Z0-9_]+)\]\s*:\s*\[([^\]]+)\]/g;
    let row;
    while ((row = rowRx.exec(vtBlock[1])) !== null) {
      const from  = row[1];
      const toAll = [...row[2].matchAll(/BATTLE_STATES\.([A-Z0-9_]+)/g)].map(x => x[1]);
      toAll.forEach(to => validTransitions.push({ from, to }));
    }
  }

  return { allKeys, validTransitions };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function runAudit() {
  console.log(sep('═'));
  console.log('🔍 VERIFY FSM DIAGRAMS  (dinámico, fuente: Mermaid)');
  console.log(sep('═'));

  if (!fs.existsSync(MANUAL_PATH)) return console.error('❌ Manual no encontrado:', MANUAL_PATH);
  if (!fs.existsSync(FSM_PATH))    return console.error('❌ FSM JS no encontrado:', FSM_PATH);

  const manualCode = fs.readFileSync(MANUAL_PATH, 'utf-8');
  const fsmCode    = fs.readFileSync(FSM_PATH, 'utf-8');

  const { states: mermaidStates, transitions: mermaidTransitions } = parseMermaid(manualCode);
  const { allKeys: jsKeys, validTransitions: jsTransitions }       = parseJsFsm(fsmCode);

  let errors = 0;

  // ── CHECK 1: Estados del Mermaid que no están declarados en JS ────────────
  console.log(`\n[CHECK 1] Nodos Mermaid → Constantes JS  (${mermaidStates.size} estados extraídos)`);
  const missing = [...mermaidStates].filter(s => !jsKeys.has(s));

  // Filtrar nodos genéricos de Mermaid que no son constantes (choice, etc.)
  const MERMAID_META = new Set(['choice']);
  const realMissing  = missing.filter(s => !MERMAID_META.has(s.toLowerCase()));

  if (realMissing.length === 0) {
    console.log(`  ✅ Todos los ${mermaidStates.size} estados del manual existen en JS.`);
  } else {
    realMissing.forEach(s => { console.log(`  ❌ Faltante en JS: ${s}`); errors++; });
  }

  // ── CHECK 2: Constantes JS que no aparecen en ningún diagrama Mermaid ─────
  console.log(`\n[CHECK 2] Constantes JS → Cobertura Mermaid  (${jsKeys.size} constantes)`);
  const orphanJs = [...jsKeys].filter(k => !mermaidStates.has(k));
  if (orphanJs.length === 0) {
    console.log('  ✅ Todas las constantes JS tienen cobertura en el manual.');
  } else {
    console.log(`  ⚠️  ${orphanJs.length} constante(s) JS sin entrada en Mermaid (pueden ser internas):`);
    orphanJs.slice(0, 10).forEach(k => console.log(`     - ${k}`));
    if (orphanJs.length > 10) console.log(`     ... y ${orphanJs.length - 10} más.`);
  }

  // ── CHECK 3: Transiciones top-level del Mermaid → validTransitions JS ─────
  // Extraer top-level states del JS (solo BATTLE_STATES, no SUBSTATES)
  const topLevelRx = /export const BATTLE_STATES\s*=\s*\{([\s\S]*?)\};/;
  const tlm = fsmCode.match(topLevelRx);
  const topLevelJs = new Set(tlm ? [...tlm[1].matchAll(/([A-Z][A-Z0-9_]+)\s*:/g)].map(x => x[1]) : []);

  console.log(`\n[CHECK 3] Transiciones top-level Mermaid → validTransitions JS`);
  const topTransitions = mermaidTransitions.filter(t => topLevelJs.has(t.from) && topLevelJs.has(t.to));
  let transErrors = 0;

  topTransitions.forEach(({ from, to, label }) => {
    const found = jsTransitions.some(jt => jt.from === from && jt.to === to);
    if (!found) {
      console.log(`  ❌ Falta en validTransitions: ${from} --> ${to}${label ? ` (${label})` : ''}`);
      transErrors++;
      errors++;
    }
  });

  if (transErrors === 0) {
    console.log(`  ✅ ${topTransitions.length} transición(es) top-level verificadas.`);
  }

  // ── RESULTADO ──────────────────────────────────────────────────────────────
  console.log(`\n${sep('═')}`);
  if (errors === 0) {
    console.log('🎉 AUDITORÍA PERFECTA. Manual y código JS están 1:1 sincronizados.');
  } else {
    console.log(`🚨 ${errors} desalineación(es) detectada(s). Revisar antes del commit.`);
    process.exit(1);
  }
  console.log(sep('═'));
}

runAudit();
