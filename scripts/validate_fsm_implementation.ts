/**
 * AUDITOR MAESTRO FSM v7.6 - RIGUROSIDAD QUIRÚRGICA TOTAL + DINAMISMO.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const FSM_PATH = path.join(SRC_ROOT, 'logic/battle/battleStateMachine.ts');

// ─── Descubrimiento Dinámico de Archivos ──────────────────────────────────────
async function walk(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((res) => {
      const resPath = path.resolve(dir, res.name);
      return res.isDirectory() ? walk(resPath) : (['.ts', '.vue'].includes(path.extname(res.name)) ? [resPath] : []);
    }));
    return files.flat();
  } catch { return []; }
}

async function discoverFsmRelatedFiles() {
  const allFiles = await walk(SRC_ROOT);
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

function parseFsmConstants(fsmCode: string) {
  const allKeys = new Set<string>();
  const substates = new Set<string>();
  const objRx = /export const (BATTLE_STATES|BATTLE_SUBSTATES)\s*=\s*\{([\s\S]*?)\}\s*(as const)?\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = objRx.exec(fsmCode)) !== null) {
    const isTop = m[1] === 'BATTLE_STATES';
    const keyRx = /([A-Z][A-Z0-9_]+)\s*:/g;
    let km: RegExpExecArray | null;
    while ((km = keyRx.exec(m[2]!)) !== null) if (km?.[1]) {
      allKeys.add(km[1]);
      if (!isTop) substates.add(km[1]);
    }
  }
  return { allKeys, substates };
}

async function runAudit() {
  const sep = (c = '─') => c.repeat(60);
  console.log(styleText('bold', '\n' + sep('═')));
  console.log(styleText('bold', '🛡️  VALIDADOR FSM: IMPLEMENTACIÓN v7.6'));
  console.log(sep('═'));

  const manualCode = await fs.readFile(MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(FSM_PATH, 'utf-8');
  const fileData = await discoverFsmRelatedFiles();
  
  // Código excluyendo la definición de la FSM para evitar auto-matches
  const externalCode = fileData.filter(f => !f.path.includes('battleStateMachine.ts')).map(d => d.content).join('\n\n');
  const allCode = fileData.map(d => d.content).join('\n\n');

  const { states: mermaidStates, syncRequired } = parseMermaid(manualCode);
  const { allKeys, substates } = parseFsmConstants(fsmCode);

  let errors = 0; let warnings = 0;

  // 1. Mermaid -> JS
  console.log(`\n${styleText('cyan', '[CHECK 1]')} Nodos Mermaid -> JS (${mermaidStates.size} estados)`);
  mermaidStates.forEach(s => {
    if (!allKeys.has(s)) { console.log(styleText('red', `  ❌ FAIL: '${s}' falta en JS.`)); errors++; }
  });

  // 2. Uso de Constantes (Regex Quirúrgico)
  console.log(`\n${styleText('cyan', '[CHECK 2]')} Uso de Constantes en Lógica/UI (${allKeys.size} constantes)`);
  allKeys.forEach(k => {
    const usageRx = new RegExp(`(?:\\.|'|")(${k})(?:'|")?`, 'g');
    if (!externalCode.match(usageRx)) {
      console.log(styleText('yellow', `  ⚠️  WARN: '${k}' sin uso real fuera de su definición.`));
      warnings++;
    }
  });

  // 3. Subestados (Referencias de transiciones)
  console.log(`\n${styleText('cyan', '[CHECK 3]')} Referencias de Subestados (${substates.size} subestados)`);
  substates.forEach(s => {
    const refRx = new RegExp(`(?:isSubState|fsm\\.transition|emit|SUBSTATES)\\s*\\(\\s*[^)]*${s}|['"]${s}['"]`, 'g');
    if (!externalCode.match(refRx)) {
      console.log(styleText('yellow', `  ⚠️  WARN: [PENDIENTE/HURERFANO]: ${s}`));
      warnings++;
    }
  });

  // 4. Timers Ciegos (Quirúrgico línea a línea)
  console.log(`\n${styleText('cyan', '[CHECK 4]')} Timers Ciegos - setTimeout no atómico`);
  let timerIssues = 0;
  fileData.forEach(file => {
    file.content.split('\n').forEach((line, idx) => {
      const t = line.trim();
      if (!t.includes('setTimeout') || t.startsWith('//')) return;
      const isAtomic = t.includes('await new Promise') || t.startsWith('await') || t.includes('return new Promise') || t.includes('=>');
      if (!isAtomic) {
        console.log(styleText('yellow', `  ⚠️  WARN [${path.basename(file.path)}:${idx+1}] setTimeout no atómico: ${t.slice(0, 60)}`));
        timerIssues++; warnings++;
      }
    });
  });
  if (timerIssues === 0) console.log(styleText('green', '  ✅ OK: Todos los timers son atómicos.'));

  // 5. Sincronización Mandatoria (await)
  console.log(`\n${styleText('cyan', '[CHECK 5]')} Sincronización (await) en fases críticas`);
  syncRequired.forEach(sub => {
    const usageRx = new RegExp(`(?:\\.|'|")(${sub})(?:'|")?`, 'g');
    let um: RegExpExecArray | null;
    let found = false; let unawaited = false;
    while ((um = usageRx.exec(allCode)) !== null) {
      const idx = um.index;
      const context = allCode.slice(Math.max(0, idx - 300), idx); // Contexto ampliado
      if (context.includes(`${sub}:`) || context.includes('//')) continue;
      found = true;
      if (!context.includes('await')) unawaited = true;
    }
    if (found && unawaited) { console.log(styleText('yellow', `  ⚠️  WARN: '${sub}' exige await según manual.`)); warnings++; }
    else if (found) console.log(styleText('green', `  ✅ OK: ${sub} sincronizado.`));
  });

  // 6. Guardas de Idempotencia
  console.log(`\n${styleText('cyan', '[CHECK 6]')} Guardas de Idempotencia`);
  ['isProcessing', 'handleFaint', 'faintedSides'].forEach(g => {
    if (allCode.includes(g)) console.log(styleText('green', `  ✅ OK: Guarda '${g}' activa.`));
    else { console.log(styleText('red', `  ❌ FAIL: Falta guarda '${g}'`)); errors++; }
  });

  // 7. Regla de Asientos (HUD)
  console.log(`\n${styleText('cyan', '[CHECK 7]')} Regla de Asientos (Visibilidad HUD)`);
  const seatRuleRx = /!s\?\.enemy\s*&&\s*!s\?\._initialEnemy|!battleStore\.state\.enemy|battleStore\.state\.enemy\s*===\s*null|!battleStore\.state\?\.enemy|!s\?\.enemy/;
  if (seatRuleRx.test(allCode)) console.log(styleText('green', '  ✅ OK: Regla Maestra detectada.'));
  else { console.log(styleText('red', '  ❌ FAIL: No se detecta la regla de asientos.')); errors++; }

  // 8. Ciclo Level Up
  console.log(`\n${styleText('cyan', '[CHECK 8]')} Ciclo LEVEL_UP_MODAL / pendingMoves`);
  if (allCode.includes('levelUpPokemon') && allCode.includes('CHECK_PENDING') && allCode.includes('pendingMoves')) console.log(styleText('green', '  ✅ OK: Ciclo detectado.'));
  else { console.log(styleText('red', '  ❌ FAIL: Ciclo de Level Up desalineado.')); errors++; }

  // 9. Persistencia
  console.log(`\n${styleText('cyan', '[CHECK 9]')} persistenceMode SINGLE`);
  if (allCode.includes('persistenceMode') && (allCode.includes("'SINGLE'") || allCode.includes('"SINGLE"'))) console.log(styleText('green', '  ✅ OK: Rama SINGLE detectada.'));
  else { console.log(styleText('red', '  ❌ FAIL: Rama SINGLE no detectada.')); errors++; }

  console.log(`\n${sep('═')}`);
  console.log(`RESULTADO FINAL: ${styleText(errors > 0 ? 'red' : 'green', errors + ' Errores')} | ${styleText('yellow', warnings + ' Avisos')}`);
  console.log(sep('═') + '\n');
  if (errors > 0) process.exit(1);
}

runAudit().catch(err => { console.error(err); process.exit(1); });
