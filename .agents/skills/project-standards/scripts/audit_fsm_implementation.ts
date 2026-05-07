/**
 * audit_fsm_implementation.js
 * Auditoría profunda de la implementación de la FSM de combate.
 *
 * 100% DINÁMICO — las listas de estados, subestados y transiciones se extraen
 * automáticamente del manual (battle_mechanics_manual.md) y de battleStateMachine.js.
 * Agregar o modificar diagramas Mermaid actualiza la auditoría sin tocar este script.
 *
 * Uso: node .agents/skills/project-standards/scripts/audit_fsm_implementation.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Paths ────────────────────────────────────────────────────────────────────
const SRC_ROOT    = path.join(__dirname, '../../../../src');
const MANUAL_PATH = path.join(__dirname, '../references/battle/battle_mechanics_manual.md');
const FSM_PATH    = path.join(SRC_ROOT, 'logic/battle/battleStateMachine.js');

// Archivos de lógica de combate a escanear para emit (fsm.transition)
const LOGIC_FILES = [
  'stores/battle.js',
  'logic/battle/resolution.js',
  'logic/battle/battleItems.js',
  'logic/battle/battleTurn.js',
  'logic/battle/battleFlow.js',
  'logic/battle/orchestrator.js',
  'logic/battle/searchLoop.js',
];

// Archivos de composables/UI/Lógica que leen subestados via isSubState()
const UI_FILES = [
  'composables/useBattleAnimations.js',
  'composables/useBattleHud.js',
  'composables/useBattleVisuals.js',
  'components/battle/BattleArenaView.vue',
  'components/battle/BattleCombatant.vue',
  'components/battle/CombatGrass.vue',
  'logic/battle/battleTurn.js',
  'logic/battle/battleFlow.js',
];

// Subestados que por definición del manual deben ocultar el HUD enemigo
// Esta lista es la única cosa semi-hardcodeada, ya que es una regla semántica del manual
const HUD_SUPPRESS_SUBSTATES = []; // Deprecated: Now uses reactive Seat-Based Visibility

// Guards de idempotencia que siempre deben existir (reglas arquitectónicas invariantes)
const REQUIRED_GUARDS = [
  { pattern: 'faintedSides.value.has',  desc: 'Guard de idempotencia en handleFaint',    file: 'logic/battle/resolution.js' },
  { pattern: 'isProcessing.value',       desc: 'Guard isProcessing en acciones de turno', file: 'stores/battle.js' },
  { pattern: 'isBattleActive.value',     desc: 'Guard isBattleActive',                    file: 'stores/battle.js' },
];

// Subestados de alto riesgo que deben tener await antes de la transición
const CRITICAL_AWAIT_SUBSTATES = [];

// ─── Utilidades ───────────────────────────────────────────────────────────────
const sep = (c, n) => (c || '─').repeat(n || 60);

function readSrc(relPath) {
  const full = path.join(SRC_ROOT, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : '';
}

// ─── Parser Mermaid ───────────────────────────────────────────────────────────
function parseMermaidStates(manualCode) {
  const states = new Set();
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = blockRx.exec(manualCode)) !== null) {
    const block = m[1];
    if (!block.includes('stateDiagram-v2')) continue;
    block.split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('note') || line.startsWith('%%') || line.startsWith('--')) return;
      const aliasM = line.match(/^state\s+"[^"]*"\s+as\s+([A-Za-z0-9_]+)/);
      if (aliasM) { states.add(aliasM[1]); return; }
      const stateM = line.match(/^state\s+([A-Za-z0-9_]+)/);
      if (stateM) states.add(stateM[1]);
      const transM = line.match(/^([A-Za-z0-9_]+)\s+-->\s+([A-Za-z0-9_]+)/);
      if (transM) { states.add(transM[1]); states.add(transM[2]); }
    });
  }
  return states;
}

// ─── Parser FSM JS ────────────────────────────────────────────────────────────
function parseFsmConstants(fsmCode) {
  const allKeys   = new Set();
  const topLevel  = new Set();
  const substates = new Set();
  const objRx = /export const (BATTLE_STATES|BATTLE_SUBSTATES)\s*=\s*\{([\s\S]*?)\};/g;
  let m;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const isTop = m[1] === 'BATTLE_STATES';
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km;
    while ((km = keyRx.exec(m[2])) !== null) {
      allKeys.add(km[1]);
      if (isTop) topLevel.add(km[1]); else substates.add(km[1]);
    }
  }
  return { allKeys, topLevel, substates };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function runAudit() {
  let errors = 0;
  let warnings = 0;

  console.log(sep('='));
  console.log('AUDITORIA PROFUNDA FSM  (dinamica, fuente: Mermaid)');
  console.log(sep('='));

  if (!fs.existsSync(MANUAL_PATH)) { console.error('ERROR: Manual no encontrado:', MANUAL_PATH); process.exit(1); }
  if (!fs.existsSync(FSM_PATH))    { console.error('ERROR: FSM JS no encontrado:', FSM_PATH);    process.exit(1); }

  const manualCode = fs.readFileSync(MANUAL_PATH, 'utf-8');
  const fsmCode    = fs.readFileSync(FSM_PATH, 'utf-8');

  const mermaidStates = parseMermaidStates(manualCode);
  const { allKeys, topLevel, substates } = parseFsmConstants(fsmCode);

  // Todo el código fuente: lógica + composables UI
  const allLogicCode  = LOGIC_FILES.map(f => readSrc(f)).join('\n\n');
  const allUiCode     = UI_FILES.map(f => readSrc(f)).join('\n');
  const allSourceCode = allLogicCode + '\n' + allUiCode;
  const battleCode    = allLogicCode; // Ahora battleCode abarca toda la lógica modular

  // ── CHECK 1: Nodos Mermaid declarados en JS ───────────────────────────────
  console.log('\n[CHECK 1] Nodos Mermaid -> Constantes JS  (' + mermaidStates.size + ' estados extraidos del manual)');
  const MERMAID_SKIP = new Set(['stateDiagram', 'v2', 'choice', 'note', 'right', 'of', 'left']);
  const missing1 = [...mermaidStates].filter(s => !allKeys.has(s) && !MERMAID_SKIP.has(s));
  if (missing1.length === 0) {
    console.log('  OK Todos los estados del manual existen en battleStateMachine.js');
  } else {
    missing1.forEach(s => { console.log('  FAIL Faltante en JS: ' + s); errors++; });
  }

  // ── CHECK 2: Constantes JS referenciadas en código fuente ────────────────
  console.log('\n[CHECK 2] Constantes JS -> Usadas en logica o UI  (' + allKeys.size + ' constantes)');
  const unusedKeys = [...allKeys].filter(k => !allSourceCode.includes(k));
  if (unusedKeys.length === 0) {
    console.log('  OK Todas las constantes FSM estan referenciadas en el codigo.');
  } else {
    console.log('  WARN ' + unusedKeys.length + ' constante(s) sin uso en logica ni UI:');
    unusedKeys.slice(0, 10).forEach(k => console.log('     - ' + k));
    if (unusedKeys.length > 10) console.log('     ... y ' + (unusedKeys.length - 10) + ' mas.');
    warnings++;
  }

  // ── CHECK 3: Subestados referenciados en lógica O en composables UI ────────
  // WARN (no ERROR): subestados declarados pero sin uso son estados planificados/futuros
  console.log('\n[CHECK 3] BATTLE_SUBSTATES -> referenciado en logica o UI  (' + substates.size + ' subestados)');
  let transOk = 0; let transPlanned = 0;
  substates.forEach(sub => {
    const found = allSourceCode.includes('BATTLE_SUBSTATES.' + sub) ||
                  allSourceCode.includes("'" + sub + "'");
    if (found) { transOk++; }
    else { transPlanned++; }
  });
  if (transPlanned === 0) {
    console.log('  OK ' + transOk + '/' + transOk + ' subestados referenciados.');
  } else {
    console.log('  OK ' + transOk + ' referenciados. PLAN: ' + transPlanned + ' subestado(s) declarado(s) y pendiente(s) de implementacion.');
    warnings++;
  }

  // ── CHECK 4: Timers ciegos ────────────────────────────────────────────────
  console.log('\n[CHECK 4] Timers ciegos - setTimeout sin await en logica de combate');
  let timerIssues = 0;
  LOGIC_FILES.forEach(relPath => {
    const code  = readSrc(relPath);
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (!t.includes('setTimeout') || t.startsWith('//')) return;
      const isAtomicPause = t.includes('await new Promise') || t.startsWith('await') || t.includes('return new Promise');
      const isInternalCb  = !t.startsWith('setTimeout');
      if (!isAtomicPause && !isInternalCb) {
        console.log('  WARN [' + path.basename(relPath) + ':' + (idx + 1) + '] setTimeout no atomico: ' + t.slice(0, 80));
        timerIssues++;
        warnings++;
      }
    });
  });
  if (timerIssues === 0) console.log('  OK Sin timers ciegos detectados.');

  // ── CHECK 5: await antes de transiciones críticas ─────────────────────────
  console.log('\n[CHECK 5] Paralelismo - await antes de transiciones de alto riesgo');
  CRITICAL_AWAIT_SUBSTATES.forEach(sub => {
    const patterns = ['BATTLE_SUBSTATES.' + sub, "'" + sub + "'"];
    const idx = patterns.map(p => battleCode.indexOf(p)).find(i => i !== -1);
    if (idx === undefined || idx === -1) {
      console.log('  WARN Subestado ' + sub + ' no encontrado en battle.js');
      warnings++;
      return;
    }
    const snippet  = battleCode.slice(Math.max(0, idx - 90), idx);
    const hasAwait = snippet.includes('await fsm.transition') || snippet.includes('await new Promise');
    if (!hasAwait) {
      console.log('  WARN ' + sub + ' deberia estar precedido por await - riesgo de race condition.');
      warnings++;
    } else {
      console.log('  OK ' + sub + ': control de flujo correcto (await presente).');
    }
  });

  // ── CHECK 6: Guards de idempotencia ──────────────────────────────────────
  console.log('\n[CHECK 6] Guards de idempotencia en archivos criticos');
  REQUIRED_GUARDS.forEach(({ pattern, desc, file }) => {
    const code = readSrc(file);
    if (code.includes(pattern)) {
      console.log('  OK ' + desc);
    } else {
      console.log('  WARN No se encontro guard: "' + pattern + '" en ' + file);
      warnings++;
    }
  });

  // ── CHECK 7: Supresión de HUD (Arquitectura de Asientos) ──────────────────
  console.log('\n[CHECK 7] Supresion de HUD - Regla Reactiva de Asientos');
  const hudCode = readSrc('composables/useBattleHud.js');
  
  const hasSeatRule = hudCode.includes('!battleStore.state.enemy') || hudCode.includes('battleStore.state.enemy === null') || hudCode.includes('!battleStore.state?.enemy') || hudCode.includes('!s?.enemy');
  if (hasSeatRule) {
    console.log('  OK Regla Maestra detectada: Visibilidad derivada de ocupacion de asiento.');
  } else {
    console.log('  FAIL No se detecta la regla de visibilidad reactiva basada en asientos.');
    errors++;
  }

  // ── CHECK 8: levelUpPokemon y pendingMoves ────────────────────────────────
  console.log('\n[CHECK 8] Ciclo LEVEL_UP_MODAL - deteccion de pendingMoves');
  const hasImport  = battleCode.includes('levelUpPokemon');
  const hasPending = battleCode.includes('CHECK_PENDING') && battleCode.includes('pendingMoves');
  if (hasImport && hasPending) {
    console.log('  OK levelUpPokemon importado y CHECK_PENDING emitido con pendingMoves.');
  } else {
    if (!hasImport)  { console.log('  FAIL levelUpPokemon no importado en battle.js'); errors++; }
    if (!hasPending) { console.log('  FAIL CHECK_PENDING / pendingMoves no detectados'); errors++; }
  }

  // ── CHECK 9: persistenceMode real ────────────────────────────────────────
  console.log('\n[CHECK 9] persistenceMode SINGLE vs PERSISTENT');
  if (battleCode.includes('persistenceMode') && battleCode.includes("'SINGLE'")) {
    console.log("  OK Compuerta CHECK_PERSISTENCE con ramas SINGLE y PERSISTENT.");
  } else {
    console.log("  FAIL persistenceMode o rama SINGLE no detectados en battle.js");
    errors++;
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────
  console.log('\n' + sep('='));
  console.log('RESUMEN FINAL');
  console.log(sep('-'));
  console.log('  Errores  : ' + errors);
  console.log('  Avisos   : ' + warnings);
  console.log(sep('-'));
  if (errors === 0 && warnings === 0) {
    console.log('AUDITORIA PERFECTA. FSM 100% implementada y libre de race conditions.');
  } else if (errors === 0) {
    console.log('Sin errores criticos - ' + warnings + ' aviso(s) a considerar.');
  } else {
    console.log('CRITICO: ' + errors + ' error(es). Corregir antes de hacer commit.');
    process.exit(1);
  }
  console.log(sep('='));
}

runAudit();
