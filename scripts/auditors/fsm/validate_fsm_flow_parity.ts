/**
 * validate_fsm_flow_parity.ts
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación Dinámica.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { collectFsmFiles } from './_fsmParityParser.ts';

enableCompileCache();

const PARITY_SRC_ROOT = path.resolve(process.cwd(), 'src');
const PARITY_MANUAL_PATH = path.resolve(process.cwd(), '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md');

export interface TransitionStep {
  from: string;
  to: string;
  isLoop: boolean;
}

export async function getExecutionSequence(): Promise<string[]> {
  const allFiles = collectFsmFiles(PARITY_SRC_ROOT);
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

export function parseMermaidSequences(content: string) {
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

export type FsmFlowParityRuleId = 'fsm-flow-sequence-missing';

export const FSM_FLOW_PARITY_RULES: readonly FsmFlowParityRuleId[] = [
  'fsm-flow-sequence-missing'
] as const;

export class FsmFlowParityAuditor extends BaseAuditor<FsmFlowParityRuleId> {
  constructor() {
    super({
      id: 'validate_fsm_flow_parity',
      name: 'FSM Flow Parity Validator',
      description: 'Secuencia de combate discrepante con el manual',
      family: 'fsm',
      ruleIds: FSM_FLOW_PARITY_RULES,
      ruleDescriptions: {
        'fsm-flow-sequence-missing': 'Secuencia de eventos FSM ausente en código'
      },
      requiredFiles: [PARITY_MANUAL_PATH]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Extracting dynamic execution sequence from source code...');
    const manual = await fs.readFile(PARITY_MANUAL_PATH, 'utf-8');
    const executionSequence = await getExecutionSequence();
    const mermaidSeqs = parseMermaidSequences(manual);
    this.filesScannedCount = executionSequence.length;

    this.context.logStep(2, 2, `Evaluating ${mermaidSeqs.length} Mermaid sequences against runtime flow...`);

    let okTransitionsCount = 0;
    let loopTransitionsCount = 0;

    mermaidSeqs.forEach((seq, idx) => {
      seq.forEach((step: TransitionStep) => {
        const allFromIndices = executionSequence.map((s, i) => s === step.from ? i : -1).filter(i => i !== -1);
        const allToIndices = executionSequence.map((s, i) => s === step.to ? i : -1).filter(i => i !== -1);

        if (allFromIndices.length === 0 || allToIndices.length === 0) return;

        const hasValidSequence = allFromIndices.some(fIdx => allToIndices.some(tIdx => tIdx > fIdx));

        if (!hasValidSequence && !step.isLoop) {
          this.addViolation({
            ruleId: 'fsm-flow-sequence-missing',
            severity: 'error',
            file: '.agents/skills/project-standards/references/battle/battle_mechanics_manual.md',
            line: 1,
            message: `Secuencia Mermaid #${idx + 1}: ${step.from} -> ${step.to} no encontrada en el orden de ejecución del código.`,
            context: `${step.from} -> ${step.to}`
          });
        } else if (step.isLoop) {
          loopTransitionsCount++;
        } else {
          okTransitionsCount++;
        }
      });
    });

    this.context.setMetric('Code steps detected', executionSequence.length);
    this.context.setMetric('Mermaid seqs evaluated', mermaidSeqs.length);
    this.context.setMetric('Valid transitions', okTransitionsCount);
    this.context.setMetric('Circular loops', loopTransitionsCount);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new FsmFlowParityAuditor());
}
