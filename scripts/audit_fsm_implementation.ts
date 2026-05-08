/**
 * audit_fsm_implementation.ts
 * Auditoría profunda de la implementación de la FSM de combate (Node.js 26+).
 *
 * 100% DINÁMICO — las listas de estados, subestados y transiciones se extraen
 * automáticamente del manual (battle_mechanics_manual.md) y de battleStateMachine.js.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

// ─── Paths ────────────────────────────────────────────────────────────────────
const SRC_ROOT = path.resolve(process.cwd(), 'src');
const MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const FSM_PATH = path.join(SRC_ROOT, 'logic/battle/battleStateMachine.ts');

// Archivos de lógica de combate a escanear para emit (fsm.transition)
const LOGIC_FILES = [
  'stores/battle.ts',
  'logic/battle/resolution.ts',
  'logic/battle/battleItems.ts',
  'logic/battle/battleTurn.ts',
  'logic/battle/battleFlow.ts',
  'logic/battle/orchestrator.ts',
  'logic/battle/searchLoop.ts',
];

// Archivos de composables/UI/Lógica que leen subestados via isSubState()
const UI_FILES = [
  'composables/useBattleAnimations.ts',
  'composables/useBattleHud.ts',
  'composables/useBattleVisuals.ts',
  'components/battle/BattleArenaView.vue',
  'components/battle/BattleCombatant.vue',
  'components/battle/CombatGrass.vue',
  'logic/battle/battleTurn.ts',
  'logic/battle/battleFlow.ts',
];

// Guards de idempotencia que siempre deben existir (reglas arquitectónicas invariantes)
const REQUIRED_GUARDS = [
  { pattern: 'faintedSides.value.has', desc: 'Guard de idempotencia en handleFaint', file: 'logic/battle/resolution.ts' },
  { pattern: 'isProcessing.value', desc: 'Guard isProcessing en acciones de turno', file: 'stores/battle.ts' },
  { pattern: 'isBattleActive.value', desc: 'Guard isBattleActive', file: 'stores/battle.ts' },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────
const sep = (c: string, n?: number) => (c || '─').repeat(n || 60);

async function readSrc(relPath: string): Promise<string> {
  const full = path.join(SRC_ROOT, relPath);
  try {
    return await fs.readFile(full, 'utf-8');
  } catch {
    return '';
  }
}

// ─── Parser Mermaid ───────────────────────────────────────────────────────────
function parseMermaidStates(manualCode: string): Set<string> {
  const states = new Set<string>();
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = blockRx.exec(manualCode)) !== null) {
    const block = m[1];
    if (!block || !block.includes('stateDiagram-v2')) continue;
    block.split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('note') || line.startsWith('%%') || line.startsWith('--')) return;
      const aliasM = line.match(/^state\s+"[^"]*"\s+as\s+([A-Za-z0-9_]+)/);
      if (aliasM && aliasM[1]) { states.add(aliasM[1]); return; }
      const stateM = line.match(/^state\s+([A-Za-z0-9_]+)/);
      if (stateM && stateM[1]) { states.add(stateM[1]); return; }
      const transM = line.match(/^([A-Za-z0-9_]+)\s+-->\s+([A-Za-z0-9_]+)/);
      if (transM && transM[1] && transM[2]) { states.add(transM[1]); states.add(transM[2]); }
    });
  }
  return states;
}

// ─── Parser FSM JS ────────────────────────────────────────────────────────────
function parseFsmConstants(fsmCode: string): { allKeys: Set<string>; substates: Set<string> } {
  const allKeys = new Set<string>();
  const substates = new Set<string>();
  const objRx = /export const (BATTLE_STATES|BATTLE_SUBSTATES)\s*=\s*\{([\s\S]*?)\}\s*(as const)?\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const isTop = m[1] === 'BATTLE_STATES';
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km: RegExpExecArray | null;
    while ((km = keyRx.exec(m[2]!)) !== null) {
      if (km[1]) {
        allKeys.add(km[1]);
        if (!isTop) substates.add(km[1]);
      }
    }
  }
  return { allKeys, substates };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function runAudit(): Promise<void> {
  let errors = 0;
  let warnings = 0;

  console.log(sep('='));
  console.log(styleText('bold', 'AUDITORIA PROFUNDA FSM  (dinámica, fuente: Mermaid)'));
  console.log(sep('='));

  try {
    await fs.access(MANUAL_PATH);
    await fs.access(FSM_PATH);
  } catch {
    console.error(styleText('red', 'ERROR: Manual o FSM JS no encontrado.'));
    process.exit(1);
  }

  const manualCode = await fs.readFile(MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(FSM_PATH, 'utf-8');

  const mermaidStates = parseMermaidStates(manualCode);
  const { allKeys, substates } = parseFsmConstants(fsmCode);

  // Todo el código fuente: lógica + composables UI
  const allLogicCodeArray = await Promise.all(LOGIC_FILES.map(f => readSrc(f)));
  const allUiCodeArray = await Promise.all(UI_FILES.map(f => readSrc(f)));
  
  const allLogicCode = allLogicCodeArray.join('\n\n');
  const allUiCode = allUiCodeArray.join('\n');
  const allSourceCode = allLogicCode + '\n' + allUiCode;
  const battleCode = allLogicCode;

  // ── CHECK 1: Nodos Mermaid declarados en JS ───────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 1]')} Nodos Mermaid -> Constantes JS  (${mermaidStates.size} estados)`);
  const MERMAID_SKIP = new Set(['stateDiagram', 'v2', 'choice', 'note', 'right', 'of', 'left']);
  const missing1 = [...mermaidStates].filter(s => !allKeys.has(s) && !MERMAID_SKIP.has(s));
  if (missing1.length === 0) {
    console.log(styleText('green', '  OK Todos los estados del manual existen en battleStateMachine.js'));
  } else {
    missing1.forEach(s => { console.log(styleText('red', '  FAIL Faltante en JS: ' + s)); errors++; });
  }

  // ── CHECK 2: Constantes JS referenciadas en código fuente ────────────────
  console.log(`\n${styleText('cyan', '[CHECK 2]')} Constantes JS -> Usadas en lógica o UI  (${allKeys.size} constantes)`);
  const unusedKeys = [...allKeys].filter(k => !allSourceCode.includes(k));
  if (unusedKeys.length === 0) {
    console.log(styleText('green', '  OK Todas las constantes FSM están referenciadas.'));
  } else {
    console.log(styleText('yellow', `  WARN ${unusedKeys.length} constante(s) sin uso:`));
    unusedKeys.slice(0, 5).forEach(k => console.log('     - ' + k));
    warnings++;
  }

  // ── CHECK 3: Subestados referenciados ──────────────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 3]')} BATTLE_SUBSTATES -> referenciado en logica o UI  (${substates.size} subestados)`);
  let transOk = 0; let transPlanned = 0;
  substates.forEach(sub => {
    const found = allSourceCode.includes('BATTLE_SUBSTATES.' + sub) ||
                  allSourceCode.includes("'" + sub + "'");
    if (found) { transOk++; }
    else { transPlanned++; }
  });
  if (transPlanned === 0) {
    console.log(styleText('green', `  OK ${transOk}/${transOk} subestados referenciados.`));
  } else {
    console.log(styleText('yellow', `  OK ${transOk} referenciados. PLAN: ${transPlanned} subestado(s) pendiente(s).`));
    substates.forEach(sub => {
      if (!allSourceCode.includes('BATTLE_SUBSTATES.' + sub) && !allSourceCode.includes("'" + sub + "'")) {
        console.log(styleText('yellow', `     - [PENDIENTE]: ${sub}`));
      }
    });
    warnings++;
  }

  // ── CHECK 4: Timers ciegos ────────────────────────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 4]')} Timers ciegos - setTimeout sin await en logica de combate`);
  let timerIssues = 0;
  for (const relPath of LOGIC_FILES) {
    const code = await readSrc(relPath);
    const lines = code.split('\n');
    lines.forEach((line: string, idx: number) => {
      const t = line.trim();
      if (!t.includes('setTimeout') || t.startsWith('//')) return;
      const isAtomicPause = t.includes('await new Promise') || t.startsWith('await') || t.includes('return new Promise');
      if (!isAtomicPause && !t.includes('=>')) {
        console.log(styleText('yellow', `  WARN [${path.basename(relPath)}:${idx + 1}] setTimeout no atomico: ${t.slice(0, 80)}`));
        timerIssues++;
        warnings++;
      }
    });
  }
  if (timerIssues === 0) console.log(styleText('green', '  OK Sin timers ciegos detectados.'));

  // ── CHECK 5: await antes de transiciones críticas ─────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 5]')} Paralelismo - await antes de transiciones de alto riesgo`);
  const CRITICAL_AWAIT_SUBSTATES: string[] = ['BATTLE_START', 'MOVE_EXECUTION', 'FAINT_CHECK'];
  CRITICAL_AWAIT_SUBSTATES.forEach((sub: string) => {
    const patterns = ['BATTLE_SUBSTATES.' + sub, "'" + sub + "'"];
    const idx = patterns.map(p => battleCode.indexOf(p)).find(i => i !== -1);
    if (idx === undefined || idx === -1) {
      console.log(styleText('yellow', `  WARN Subestado ${sub} no encontrado en battle.js`));
      warnings++;
      return;
    }
    const snippet = battleCode.slice(Math.max(0, idx - 90), idx);
    const hasAwait = snippet.includes('await fsm.transition') || snippet.includes('await new Promise');
    if (!hasAwait) {
      console.log(styleText('yellow', `  WARN ${sub} deberia estar precedido por await - riesgo de race condition.`));
      warnings++;
    } else {
      console.log(styleText('green', `  OK ${sub}: control de flujo correcto (await presente).`));
    }
  });

  // ── CHECK 6: Guards de idempotencia ──────────────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 6]')} Guards de idempotencia en archivos criticos`);
  for (const { pattern, desc, file } of REQUIRED_GUARDS) {
    const code = await readSrc(file);
    if (code.includes(pattern)) {
      console.log(styleText('green', '  OK ' + desc));
    } else {
      console.log(styleText('yellow', `  WARN No se encontro guard: "${pattern}" en ${file}`));
      warnings++;
    }
  }

  // ── CHECK 7: Supresión de HUD (Arquitectura de Asientos) ──────────────────
  console.log(`\n${styleText('cyan', '[CHECK 7]')} Supresion de HUD - Regla Reactiva de Asientos`);
  const hudCode = await readSrc('composables/useBattleHud.ts');
  const seatRuleRx = /!s\?\.enemy\s*&&\s*!s\?\._initialEnemy|!battleStore\.state\.enemy|battleStore\.state\.enemy\s*===\s*null|!battleStore\.state\?\.enemy|!s\?\.enemy/;
  const hasSeatRule = seatRuleRx.test(hudCode);
  if (hasSeatRule) {
    console.log(styleText('green', '  OK Regla Maestra detectada: Visibilidad derivada de ocupacion de asiento.'));
  } else {
    console.log(styleText('red', '  FAIL No se detecta la regla de visibilidad reactiva basada en asientos.'));
    errors++;
  }

  // ── CHECK 8: levelUpPokemon y pendingMoves ────────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 8]')} Ciclo LEVEL_UP_MODAL - deteccion de pendingMoves`);
  const hasImport = battleCode.includes('levelUpPokemon');
  const hasPending = battleCode.includes('CHECK_PENDING') && battleCode.includes('pendingMoves');
  if (hasImport && hasPending) {
    console.log(styleText('green', '  OK levelUpPokemon importado y CHECK_PENDING emitido con pendingMoves.'));
  } else {
    if (!hasImport) { console.log(styleText('red', '  FAIL levelUpPokemon no importado en battle.js')); errors++; }
    if (!hasPending) { console.log(styleText('red', '  FAIL CHECK_PENDING / pendingMoves no detectados')); errors++; }
  }

  // ── CHECK 9: persistenceMode real ────────────────────────────────────────
  console.log(`\n${styleText('cyan', '[CHECK 9]')} persistenceMode SINGLE vs PERSISTENT`);
  if (battleCode.includes('persistenceMode') && battleCode.includes("'SINGLE'")) {
    console.log(styleText('green', "  OK Compuerta CHECK_PERSISTENCE con ramas SINGLE y PERSISTENT."));
  } else {
    console.log(styleText('red', "  FAIL persistenceMode o rama SINGLE no detectados en battle.js"));
    errors++;
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────
  console.log('\n' + sep('='));
  console.log(styleText('bold', 'RESUMEN FINAL'));
  console.log(sep('-'));
  console.log('  Errores  : ' + errors);
  console.log('  Avisos   : ' + warnings);
  console.log(sep('-'));
  if (errors === 0 && warnings === 0) {
    console.log(styleText('green', 'AUDITORIA PERFECTA. FSM 100% implementada.'));
  } else if (errors === 0) {
    console.log(styleText('yellow', `Sin errores críticos - ${warnings} aviso(s).`));
  } else {
    console.log(styleText('red', `CRITICO: ${errors} error(es).`));
    process.exit(1);
  }
  console.log(sep('='));
}

runAudit().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal en auditoría: ${err.message}`));
  process.exit(1);
});
