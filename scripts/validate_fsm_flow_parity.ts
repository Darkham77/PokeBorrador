/**
 * validate_fsm_flow_parity.ts
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación Dinámica.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');

interface TransitionStep {
  from: string;
  to: string;
  isLoop: boolean;
}

// ─── Utilidades de Descubrimiento ───────────────────────────────────────────
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

async function getExecutionSequence(): Promise<string[]> {
  const allFiles = await walk(SRC_ROOT);
  const sequence: { file: string, state: string, index: number }[] = [];

  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const transRx = /fsm\.transition\([^,]+,\s*(?:BATTLE_SUBSTATES\.|BATTLE_STATES\.)([A-Z0-9_]+)/g;
    let m: RegExpExecArray | null;
    while ((m = transRx.exec(content)) !== null) {
      if (m[1]) {
        sequence.push({ 
          file: path.basename(file), 
          state: m[1], 
          index: m.index 
        });
      }
    }
  }
  
  return sequence.map(s => s.state);
}

function parseMermaidSequences(content: string) {
  const sequences: TransitionStep[][] = [];
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = blockRx.exec(content)) !== null) {
    const block = m[1] || '';
    if (!block.includes('stateDiagram-v2')) continue;
    
    const seq: TransitionStep[] = [];
    block.split('\n').forEach(line => {
      const clean = line.trim();
      const trans = clean.match(/^([A-Za-z0-9_]+)\s+-->\s+([A-Za-z0-9_]+)(?:\s*:\s*([^%]+))?/);
      if (trans?.[1] && trans[2] && trans[1] !== '[*]' && trans[2] !== '[*]') {
        const label = trans[3] || '';
        seq.push({ 
          from: trans[1], 
          to: trans[2],
          isLoop: label.includes('↺') || label.toLowerCase().includes('loop') || label.toLowerCase().includes('circular')
        });
      }
    });
    if (seq.length > 0) sequences.push(seq);
  }
  return sequences;
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
  console.log(styleText('bold', '🛡️  VALIDADOR FSM: PARIDAD DE FLUJO v7.6'));
  console.log(sep('═'));

  try {
    await fs.access(MANUAL_PATH);
  } catch {
    console.error(styleText('red', `❌ Manual no encontrado: ${MANUAL_PATH}`));
    process.exit(1);
  }

  const manual = await fs.readFile(MANUAL_PATH, 'utf-8');
  const executionSequence = await getExecutionSequence();
  const mermaidSeqs = parseMermaidSequences(manual);

  console.log(styleText('cyan', `\nSecuencia detectada en el código (${executionSequence.length} pasos):`));
  console.log(executionSequence.slice(0, 10).join(' -> ') + (executionSequence.length > 10 ? ' ...' : ''));

  const errors: string[] = [];
  const warnings: string[] = [];
  const okTransitions: string[] = [];
  const loopTransitions: string[] = [];

  mermaidSeqs.forEach((seq, idx) => {
    seq.forEach((step: TransitionStep) => {
      const allFromIndices = executionSequence.map((s, i) => s === step.from ? i : -1).filter(i => i !== -1);
      const allToIndices = executionSequence.map((s, i) => s === step.to ? i : -1).filter(i => i !== -1);

      if (allFromIndices.length === 0 || allToIndices.length === 0) return;

      const hasValidSequence = allFromIndices.some(fIdx => allToIndices.some(tIdx => tIdx > fIdx));

      if (!hasValidSequence && !step.isLoop) {
        errors.push(`Secuencia Mermaid #${idx + 1}: ${step.from} -> ${step.to} no encontrada en el código.`);
      } else if (step.isLoop) {
        loopTransitions.push(`Secuencia Mermaid #${idx + 1}: ${step.from} -> ${step.to} (Loop circular)`);
      } else {
        okTransitions.push(`Secuencia Mermaid #${idx + 1}: ${step.from} -> ${step.to}`);
      }
    });
  });

  console.log(`\n════════════════════════════════════`);
  console.log(`    FSM FLOW PARITY REPORT`);
  console.log(`════════════════════════════════════`);
  console.log(`🤖 Pasos detectados en código:  ${executionSequence.length}`);
  console.log(`🧜 Secuencias Mermaid evaluadas: ${mermaidSeqs.length}`);
  console.log(`✅ Transiciones correctas:       ${okTransitions.length}`);
  console.log(`🔄 Transiciones loop/circular:   ${loopTransitions.length}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- FSM FLOW PARITY REPORT ---`,
      `Pasos en código:              ${executionSequence.length}`,
      `Secuencias Mermaid evaluadas: ${mermaidSeqs.length}`,
      `Transiciones correctas:       ${okTransitions.length}`,
      `Transiciones loop/circular:   ${loopTransitions.length}`,
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
      console.log(styleText('green', '✅ Paridad de flujo validada exitosamente.'));
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
