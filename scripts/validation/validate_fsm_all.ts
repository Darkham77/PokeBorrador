// fallow-ignore-file security-sink
/**
 * scripts/validation/validate_fsm_all.ts
 * 
 * COORDINADOR DE VALIDACIONES FSM (Node.js 26+)
 * 
 * Ejecuta todas las validaciones de FSM secuencialmente sin abortar ante fallos,
 * acumulando los resultados para reportar al final si hubo errores.
 */

import { spawnSync } from 'node:child_process';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

interface Task {
  name: string;
  args: string[];
}

const FSM_VALIDATION_TASKS: Task[] = [
  { name: 'FSM Diagrams', args: ['scripts/validation/validate_fsm_diagrams.ts'] },
  { name: 'FSM Implementation', args: ['scripts/validation/validate_fsm_implementation.ts'] },
  { name: 'FSM Flow Parity', args: ['scripts/validation/validate_fsm_flow_parity.ts'] }
];

function runFsmValidation() {
  let anyFailed = false;

  for (const task of FSM_VALIDATION_TASKS) {
    console.log(styleText('bold', `\n--- 🤖 Ejecutando: ${task.name} ---`));
    const proc = spawnSync('node', [
      '--permission',
      '--experimental-strip-types',
      '--allow-fs-read=.',
      '--allow-fs-write=.',
      ...task.args
    ], { stdio: 'inherit' });

    if (proc.status !== 0) {
      anyFailed = true;
    }
  }

  if (anyFailed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFsmValidation();
