/**
 * AUDITOR MAESTRO FSM v7.6 - RIGUROSIDAD QUIRÚRGICA TOTAL + DINAMISMO.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';

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

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  const sep = (c = '─') => c.repeat(60);
  console.log(styleText('bold', '\n' + sep('═')));
  console.log(styleText('bold', '🛡️  VALIDADOR FSM: IMPLEMENTACIÓN v7.6'));
  console.log(sep('═'));

  try {
    await fs.access(MANUAL_PATH);
    await fs.access(FSM_PATH);
  } catch {
    console.error(styleText('red', `❌ Archivos requeridos no encontrados.`));
    process.exit(1);
  }

  const manualCode = await fs.readFile(MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(FSM_PATH, 'utf-8');
  const fileData = await discoverFsmRelatedFiles();
  
  const externalCode = fileData.filter(f => !f.path.includes('battleStateMachine.ts')).map(d => d.content).join('\n\n');
  const allCode = fileData.map(d => d.content).join('\n\n');

  const { states: mermaidStates, syncRequired } = parseMermaid(manualCode);
  mermaidStates.delete('fork_state');
  mermaidStates.delete('join_state');
  const { allKeys, substates } = parseFsmConstants(fsmCode);

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Mermaid -> JS
  mermaidStates.forEach(s => {
    if (!allKeys.has(s)) {
      errors.push(`[CHECK 1] Nodo Mermaid '${s}' falta en JS.`);
    }
  });

  // 2. Uso de Constantes
  allKeys.forEach(k => {
    const usageRx = new RegExp(`(?:\\.|'|")(${k})(?:'|")?`, 'g');
    if (!externalCode.match(usageRx)) {
      warnings.push(`[CHECK 2] Constante '${k}' definida pero sin uso real fuera de battleStateMachine.ts.`);
    }
  });

  // 3. Subestados (Referencias de transiciones)
  substates.forEach(s => {
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
        warnings.push(`[CHECK 4] setTimeout no atómico en ${path.basename(file.path)}:${idx + 1}: ${t.slice(0, 60)}`);
      }
    });
  });

  // 5. Sincronización Mandatoria (await)
  syncRequired.forEach(sub => {
    const usageRx = new RegExp(`(?:\\.|'|")(${sub})(?:'|")?`, 'g');
    let um: RegExpExecArray | null;
    let found = false; let unawaited = false;
    while ((um = usageRx.exec(allCode)) !== null) {
      const idx = um.index;
      const context = allCode.slice(Math.max(0, idx - 300), idx);
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

  console.log(`\n════════════════════════════════════`);
  console.log(`    FSM IMPLEMENTATION REPORT`);
  console.log(`════════════════════════════════════`);
  console.log(`📂 Archivos escaneados:   ${fileData.length}`);
  console.log(`🧜 Estados Mermaid:       ${mermaidStates.size}`);
  console.log(`⚙️ Constantes FSM:        ${allKeys.size}`);
  console.log(`⚙️ Subestados:            ${substates.size}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- FSM IMPLEMENTATION REPORT ---`,
      `Archivos escaneados:   ${fileData.length}`,
      `Estados Mermaid:       ${mermaidStates.size}`,
      `Constantes FSM:        ${allKeys.size}`,
      `Subestados:            ${substates.size}`,
      `\nErrors (${errors.length}):`,
      ...errors.map(e => `  - ${e}`),
      `\nWarnings (${warnings.length}):`,
      ...warnings.map(w => `  - ${w}`)
    ];
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.summary) {
    console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${errors.length} errores, ${warnings.length} advertencias.`));
  } else {
    if (warnings.length) {
      console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
      const limit = 30;
      warnings.slice(0, limit).forEach(w => console.log(`   ${w}`));
      if (warnings.length > limit) {
        console.log(styleText('cyan', `   ... y ${warnings.length - limit} advertencias más (usa -o para ver todas)`));
      }
      console.log('');
    }

    if (errors.length) {
      console.log(styleText('red', `❌ ERRORES (${errors.length}):`));
      const limit = 30;
      errors.slice(0, limit).forEach(e => console.log(`   ${e}`));
      if (errors.length > limit) {
        console.log(styleText('cyan', `   ... y ${errors.length - limit} errores más (usa -o para ver todos)`));
      }
    } else {
      console.log(styleText('green', '✅ Todos los checks de implementación de la FSM pasaron con éxito.'));
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
