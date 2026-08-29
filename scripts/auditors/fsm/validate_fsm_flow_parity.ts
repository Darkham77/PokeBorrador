// fallow-ignore-file security-sink
/**
 * validate_fsm_flow_parity.ts
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación Dinámica.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

const PARITY_SRC_ROOT = path.resolve(process.cwd(), 'src');
const PARITY_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');
const MAX_SEQUENCE_PREVIEW_LIMIT = 10;

interface TransitionStep {
  from: string;
  to: string;
  isLoop: boolean;
}

// ─── Utilidades de Descubrimiento ───────────────────────────────────────────
import { walkSourceFiles as walk } from './_fsmParityParser.ts';

async function getExecutionSequence(): Promise<string[]> {
  const allFiles = await walk(PARITY_SRC_ROOT);
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
  const validator = setupValidation({
    title: 'FSM FLOW PARITY VALIDATOR',
    requiredFiles: [PARITY_MANUAL_PATH]
  });

  await validator.checkFiles();

  const manual = await fs.readFile(PARITY_MANUAL_PATH, 'utf-8');
  const executionSequence = await getExecutionSequence();
  const mermaidSeqs = parseMermaidSequences(manual);

  console.log(styleText('cyan', `\nSecuencia detectada en el código (${executionSequence.length} pasos):`));
  console.log(executionSequence.slice(0, MAX_SEQUENCE_PREVIEW_LIMIT).join(' -> ') + (executionSequence.length > MAX_SEQUENCE_PREVIEW_LIMIT ? ' ...' : ''));

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain
  const okTransitions: string[] = []; // no-domain
  const loopTransitions: string[] = []; // no-domain

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
  await validator.finish(
    {
      'Pasos detectados en código': executionSequence.length,
      'Secuencias Mermaid evaluadas': mermaidSeqs.length,
      'Transiciones correctas': okTransitions.length,
      'Transiciones loop/circular': loopTransitions.length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
