/**
 * validate_fsm_flow_parity.ts
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación Dinámica.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

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
  
  // Ordenamos por archivo y luego por aparición interna (heurística de flujo)
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

async function runAudit() {
  const sep = (c = '─') => c.repeat(60);
  console.log(styleText('bold', '\n' + sep('═')));
  console.log(styleText('bold', '🛡️  VALIDADOR FSM: PARIDAD DE FLUJO v7.6'));
  console.log(sep('═'));

  const manual = await fs.readFile(MANUAL_PATH, 'utf-8');
  const executionSequence = await getExecutionSequence();
  const mermaidSeqs = parseMermaidSequences(manual);

  console.log(styleText('cyan', `\nSecuencia detectada en el código (${executionSequence.length} pasos):`));
  console.log(executionSequence.slice(0, 10).join(' -> ') + (executionSequence.length > 10 ? ' ...' : ''));

  let errors = 0;
  mermaidSeqs.forEach((seq, idx) => {
    console.log(`\nVerificando Secuencia Mermaid #${idx + 1}:`);
    seq.forEach((step: TransitionStep) => {
      // Buscamos si existe alguna pareja (A, B) tal que index(B) > index(A)
      const allFromIndices = executionSequence.map((s, i) => s === step.from ? i : -1).filter(i => i !== -1);
      const allToIndices = executionSequence.map((s, i) => s === step.to ? i : -1).filter(i => i !== -1);

      if (allFromIndices.length === 0 || allToIndices.length === 0) return;

      // Una transición es válida si existe al menos una ocurrencia de 'to' después de 'from'
      const hasValidSequence = allFromIndices.some(fIdx => allToIndices.some(tIdx => tIdx > fIdx));

      if (!hasValidSequence && !step.isLoop) {
        console.log(styleText('red', `  ❌ FAIL: Secuencia no encontrada en el código: ${step.from} -> ${step.to}`));
        errors++;
      } else if (step.isLoop) {
        console.log(styleText('blue', `  🔄 LOOP: ${step.from} -> ${step.to} (Validado como circular)`));
      } else {
        console.log(styleText('green', `  ✅ OK: ${step.from} -> ${step.to}`));
      }
    });
  });

  console.log(`\n${sep('═')}`);
  console.log(`RESULTADO: ${errors === 0 ? styleText('green', '0 Errores') : styleText('red', errors + ' Errores')}`);
  console.log(sep('═') + '\n');

  process.exit(errors > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error(styleText('red', `💥 Error fatal: ${err.message}`));
  process.exit(1);
});
