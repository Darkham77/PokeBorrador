/**
 * validate_fsm_diagrams.ts
 * Auditoría FSM vs Manual: compara el diagrama Mermaid contra las constantes en TS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const FSM_PATH = path.join(SRC_ROOT, 'logic/battle/battleStateMachine.ts');

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
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n--- 🛡️  FSM DIAGRAMS VALIDATOR ---'));

  try {
    await fs.access(MANUAL_PATH);
    await fs.access(FSM_PATH);
  } catch {
    console.error(styleText('red', `❌ Archivos requeridos no encontrados.`));
    process.exit(1);
  }

  const manualCode = await fs.readFile(MANUAL_PATH, 'utf-8');
  const fsmCode = await fs.readFile(FSM_PATH, 'utf-8');

  const { states: mermaidStates, transitions: mermaidTransitions } = parseMermaid(manualCode);
  const { allKeys: jsKeys, jsTransitions } = parseJsFsm(fsmCode);

  const errors: string[] = [];
  const warnings: string[] = [];

  // [CHECK 1] Nodos Mermaid -> Constantes JS
  const missing = Array.from(mermaidStates).filter(s => !jsKeys.has(s));
  missing.forEach(s => {
    errors.push(`Faltante en JS: ${s}`);
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

  console.log(`\n════════════════════════════════════`);
  console.log(`    FSM DIAGRAMS INTEGRITY REPORT`);
  console.log(`════════════════════════════════════`);
  console.log(`🧜 Mermaid states:       ${mermaidStates.size}`);
  console.log(`🧜 Mermaid transitions:  ${mermaidTransitions.length}`);
  console.log(`⚙️ JS Keys:              ${jsKeys.size}`);
  console.log(`⚙️ JS Transitions:       ${jsTransitions.length}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- FSM DIAGRAMS INTEGRITY REPORT ---`,
      `Mermaid states:       ${mermaidStates.size}`,
      `Mermaid transitions:  ${mermaidTransitions.length}`,
      `JS Keys:              ${jsKeys.size}`,
      `JS Transitions:       ${jsTransitions.length}`,
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
      console.log(styleText('green', '🎉 AUDITORÍA PERFECTA.'));
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
