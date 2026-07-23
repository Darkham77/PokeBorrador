// fallow-ignore-file security-sink
/**
 * scripts/maintenance/audit_full.ts
 * 
 * COORDINADOR DE AUDITORÍA COMPLETA (Node.js 26+)
 * 
 * Ejecuta todas las validaciones y pruebas de forma secuencial sin abortar
 * ante el primer fallo, acumulando los resultados para reportar un resumen
 * consolidado al final y salir con código de error si alguna validación falló.
 * 
 * Ejecuta directamente los archivos con 'node' para evitar conflictos de sandbox de Node 26 con npm.
 */

import { spawnSync } from 'node:child_process';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

interface AuditTask {
  name: string;
  command: string;
  args: string[];
  shell?: boolean;
}

const TASKS: AuditTask[] = [
  { 
    name: 'Node.js Tests (Vitest)', 
    command: 'npm',
    args: ['run', 'test:node'],
    shell: true
  },
  { 
    name: 'Intelligent Project Audit', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=*', '--allow-fs-write=*', '--allow-child-process', 'scripts/maintenance/audit_project.ts'] 
  },
  { 
    name: 'CSS/SCSS Duplicates Audit (css-checker)', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=*', '--allow-fs-write=*', '--allow-child-process', 'scripts/maintenance/audit_project.ts', '--css-only', '--errors-only'] 
  },
  { 
    name: 'FSM Diagrams', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_fsm_diagrams.ts'] 
  },
  { 
    name: 'FSM Implementation', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_fsm_implementation.ts'] 
  },
  { 
    name: 'FSM Flow Parity', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_fsm_flow_parity.ts'] 
  },
  { 
    name: 'Items Integrity', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_items.ts'] 
  },
  { 
    name: 'Abilities Validation', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_abilities.ts'] 
  },
  { 
    name: 'Moves Database Validation', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_moves.ts'] 
  },
  { 
    name: 'SQL Migrations Integrity', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/database/validate_sql_migrations.ts'] 
  },
  {
    name: 'Save Migrations Verification',
    command: 'node',
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_save_migrations.ts']
  }
];

function runAllAudits() {
  console.log(styleText('bold', '\n======================================================'));
  console.log(styleText('bold', '🚀 INICIANDO AUDITORÍA COMPLETA Y CONSOLIDADA'));
  console.log(styleText('bold', '======================================================\n'));

  const results: { name: string; success: boolean; exitCode: number | null }[] = [];

  for (const task of TASKS) {
    console.log(styleText('bold', `\n--- 📦 Ejecutando: ${task.name} ---`));
    console.log('------------------------------------------------------');
    
    const proc = spawnSync(task.command, task.args, {
      stdio: 'inherit',
      shell: task.shell ?? false
    });

    const success = proc.status === 0;
    results.push({
      name: task.name,
      success,
      exitCode: proc.status
    });
  }

  console.log(styleText('bold', '\n======================================================'));
  console.log(styleText('bold', '📊 RESUMEN FINAL DE LA AUDITORÍA COMPLETA'));
  console.log(styleText('bold', '======================================================'));

  let anyFailed = false;
  for (const res of results) {
    if (res.success) {
      console.log(`  ✅ ${styleText('green', 'ÉXITO')} | ${res.name}`);
    } else {
      console.log(`  ❌ ${styleText('red', 'FALLÓ')} | ${res.name} (código de salida: ${res.exitCode})`);
      anyFailed = true;
    }
  }
  console.log('======================================================\n');

  if (anyFailed) {
    console.log(styleText('red', '🚨 Se encontraron errores en uno o más módulos de auditoría. Revisa los logs anteriores.'));
    process.exit(1);
  } else {
    console.log(styleText('green', '🎉 ¡Todas las auditorías y pruebas se ejecutaron con éxito!'));
    process.exit(0);
  }
}

runAllAudits();
