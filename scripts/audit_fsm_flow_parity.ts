/**
 * audit_fsm_flow_parity.js
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación en Orchestrator.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

const MANUAL_PATH = path.resolve(process.cwd(), '.agents/project-standards/references/battle/battle_mechanics_manual.md');
const ORCHESTRATOR_PATH = path.resolve(process.cwd(), 'src/logic/battle/orchestrator.js');

function parseMermaidSequences(content: string) {
  const sequences: any[] = [];
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = blockRx.exec(content)) !== null) {
    const lines = m[1]!.split('\n').map(l => l.trim());
    const seq: any[] = [];
    lines.forEach(line => {
      const trans = line.match(/([A-Z][A-Z0-9_]+)\s*-->\s*([A-Z][A-Z0-9_]+)/);
      if (trans) {
        seq.push({ from: trans[1], to: trans[2] });
      }
    });
    if (seq.length > 0) sequences.push(seq);
  }
  return sequences;
}

function extractOrchestratorTransitions(content: string) {
  const transitions: string[] = [];
  const transRx = /fsm\.transition\([^,]+,\s*BATTLE_SUBSTATES\.([A-Z][A-Z0-9_]+)/g;
  let m;
  while ((m = transRx.exec(content)) !== null) {
    transitions.push(m[1]!);
  }
  return transitions;
}

async function runAudit() {
  console.log(styleText('bold', '=== AUDITORÍA DE PARIDAD DE FLUJO FSM ===\n'));

  try {
    await fs.access(MANUAL_PATH);
    await fs.access(ORCHESTRATOR_PATH);
  } catch {
    console.error(styleText('red', 'Error: Archivos no encontrados.'));
    process.exit(1);
  }

  const manual = await fs.readFile(MANUAL_PATH, 'utf-8');
  const orch = await fs.readFile(ORCHESTRATOR_PATH, 'utf-8');

  const mermaidSeqs = parseMermaidSequences(manual);
  const orchTrans = extractOrchestratorTransitions(orch);

  console.log(styleText('cyan', 'Estados detectados en Orchestrator (en orden):'));
  console.log(orchTrans.join(' -> '));
  console.log('\n--- Verificando Caminos Mermaid ---');

  let errors = 0;
  mermaidSeqs.forEach((seq, idx) => {
    console.log(`\nSecuencia Mermaid #${idx + 1}:`);
    seq.forEach((step: any) => {
      const fromIdx = orchTrans.indexOf(step.from);
      const toIdx = orchTrans.indexOf(step.to);

      if (fromIdx === -1 || toIdx === -1) return;

      if (toIdx < fromIdx) {
        console.error(styleText('red', `  [FAIL] Secuencia invertida: ${step.from} -> ${step.to}`));
        errors++;
      } else {
        console.log(styleText('green', `  [OK] ${step.from} -> ${step.to}`));
      }
    });
  });

  console.log(`\nAuditoría finalizada con ${errors === 0 ? styleText('green', '0') : styleText('red', String(errors))} errores.`);
  process.exit(errors > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
