/**
 * audit_fsm_flow_parity.js
 * Auditoría de paridad de flujo: Compara secuencias Mermaid vs Implementación en Orchestrator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MANUAL_PATH = path.join(__dirname, '../references/battle/battle_mechanics_manual.md');
const ORCHESTRATOR_PATH = path.join(__dirname, '../../../../src/logic/battle/orchestrator.js');

function parseMermaidSequences(content) {
  const sequences = [];
  const blockRx = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = blockRx.exec(content)) !== null) {
    const lines = m[1].split('\n').map(l => l.trim());
    const seq = [];
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

function extractOrchestratorTransitions(content) {
  const transitions = [];
  const transRx = /fsm\.transition\([^,]+,\s*BATTLE_SUBSTATES\.([A-Z][A-Z0-9_]+)/g;
  let m;
  while ((m = transRx.exec(content)) !== null) {
    transitions.push(m[1]);
  }
  return transitions;
}

function runAudit() {
  console.log('=== AUDITORÍA DE PARIDAD DE FLUJO FSM ===\n');

  if (!fs.existsSync(MANUAL_PATH) || !fs.existsSync(ORCHESTRATOR_PATH)) {
    console.error('Error: Archivos no encontrados.');
    return;
  }

  const manual = fs.readFileSync(MANUAL_PATH, 'utf-8');
  const orch = fs.readFileSync(ORCHESTRATOR_PATH, 'utf-8');

  const mermaidSeqs = parseMermaidSequences(manual);
  const orchTrans = extractOrchestratorTransitions(orch);

  console.log('Estados detectados en Orchestrator (en orden):');
  console.log(orchTrans.join(' -> '));
  console.log('\n--- Verificando Caminos Mermaid ---');

  let errors = 0;
  mermaidSeqs.forEach((seq, idx) => {
    console.log(`\nSecuencia Mermaid #${idx + 1}:`);
    seq.forEach(step => {
      const fromIdx = orchTrans.indexOf(step.from);
      const toIdx = orchTrans.indexOf(step.to);

      if (fromIdx === -1 || toIdx === -1) {
        // No todos los estados de Mermaid deben estar en el orquestador (algunos son de lógica de turno)
        return;
      }

      if (toIdx < fromIdx) {
        console.error(`  [FAIL] Secuencia invertida: ${step.from} -> ${step.to}`);
        errors++;
      } else {
        console.log(`  [OK] ${step.from} -> ${step.to}`);
      }
    });
  });

  console.log(`\nAuditoría finalizada con ${errors} errores.`);
  process.exit(errors > 0 ? 1 : 0);
}

runAudit();
