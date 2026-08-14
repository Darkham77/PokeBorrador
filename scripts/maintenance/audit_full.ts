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
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

enableCompileCache();

interface AuditTask {
  name: string;
  command: string;
  args: string[];
  shell?: boolean;
}

const FULL_AUDIT_TASKS: AuditTask[] = [
  { 
    name: 'Intelligent Project Audit', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=*', '--allow-fs-write=*', '--allow-child-process', 'scripts/maintenance/audit_project.ts'] 
  },
  { 
    name: 'Domain Types Integrity Audit', 
    command: 'node', 
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', '--allow-fs-write=.', 'scripts/validation/validate_domain_types.ts', '--errors-only'] 
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

async function runAllAudits() {
  const { values } = parseArgs({
    options: {
      human: { type: 'boolean', short: 'H' },
      pretty: { type: 'boolean' },
      summary: { type: 'boolean', short: 's' },
      fast: { type: 'boolean', short: 'f' },
      'code-only': { type: 'boolean' },
      output: { type: 'string', short: 'o' },
      'changed-since': { type: 'string' },
      'errors-only': { type: 'boolean' },
      top: { type: 'string', short: 't' },
      rule: { type: 'string', short: 'r' }
    }
  });

  const isHumanMode = !!(values.human || values.pretty || values.summary);

  function logProgress(msg: string) {
    if (isHumanMode) {
      console.log(msg);
    } else {
      process.stderr.write(msg + '\n');
    }
  }

  logProgress(styleText('bold', '\n======================================================================'));
  logProgress(styleText('bold', '🚀 SUITE DE AUDITORÍA GLOBAL Y VALIDACIÓN COMPLETA (audit_full.ts)'));
  logProgress(styleText('cyan', 'ℹ️  Modo por defecto: JSON estructurado para herramientas e IA. Usa "--human" o "-H" para vista de consola.'));
  logProgress(styleText('bold', '======================================================================\n'));

  // Seleccionar tareas a ejecutar
  let tasksToRun = FULL_AUDIT_TASKS;
  if (values.fast || values['code-only']) {
    logProgress(styleText('cyan', '⚡ Modo rápido (--fast): Ejecutando únicamente auditoría estática de código...'));
    tasksToRun = [
      { 
        name: 'Intelligent Project Audit', 
        command: 'node', 
        args: ['--permission', '--experimental-strip-types', '--allow-fs-read=*', '--allow-fs-write=*', '--allow-child-process', 'scripts/maintenance/audit_project.ts'] 
      }
    ];
  }

  const results: {
    name: string;
    success: boolean;
    exitCode: number | null;
    durationMs: number;
    errors: number;
    warnings: number;
    details?: unknown;
  }[] = [];

interface CodeAuditReport {
  status?: string;
  summary?: {
    totalViolations?: number;
    errors?: number;
    warnings?: number;
    filesWithIssues?: number;
    byCategory?: Record<string, number>;
  };
  topFiles?: Array<{ file: string; errors: number; warnings: number; total: number }>;
  files?: Record<string, Array<{ line: number; severity: string; category: string; message: string; context: string }>>;
}

  let codeAuditDetails: CodeAuditReport | null = null;
  const totalTasks = tasksToRun.length;

  for (let i = 0; i < totalTasks; i++) {
    const task = tasksToRun[i]!;
    const stepNum = i + 1;
    const pct = Math.round((stepNum / totalTasks) * 100);

    logProgress(styleText('bold', `--- 📦 [Paso ${stepNum}/${totalTasks} - ${pct}%] Ejecutando: ${task.name} ---`));

    // Propagar argumentos relevantes a sub-tareas si aplica
    const taskArgs = [...task.args];
    if (task.name === 'Intelligent Project Audit') {
      if (values['changed-since']) taskArgs.push('--changed-since', values['changed-since'] as string);
      if (values['errors-only']) taskArgs.push('--errors-only');
      if (values.rule) taskArgs.push('--rule', values.rule as string);
      if (values.top) taskArgs.push('--top', values.top as string);
      if (!isHumanMode) taskArgs.push('--json');
    }

    const start = performance.now();
    const proc = spawnSync(task.command, taskArgs, {
      stdio: isHumanMode ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: task.shell ?? false,
      encoding: 'utf-8'
    });
    const durationMs = Math.round(performance.now() - start);

    const success = proc.status === 0;
    let errors = success ? 0 : 1;
    let warnings = 0;

    if (!isHumanMode && proc.stdout) {
      if (task.name === 'Intelligent Project Audit') {
        try {
          const parsed = JSON.parse(proc.stdout.trim()) as CodeAuditReport;
          codeAuditDetails = parsed;
          errors = parsed.summary?.errors ?? (success ? 0 : 1);
          warnings = parsed.summary?.warnings ?? 0;
        } catch {
          // Ignorar fallback parse
        }
      }
    }

    results.push({
      name: task.name,
      success,
      exitCode: proc.status,
      durationMs,
      errors,
      warnings
    });
  }

  const anyFailed = results.some(r => !r.success || r.errors > 0);
  const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);
  const totalWarnings = results.reduce((acc, r) => acc + r.warnings, 0);
  const suitesPassed = results.filter(r => r.success).length;

  const consolidatedReport = {
    status: anyFailed ? 'failed' : 'passed',
    summary: {
      totalViolations: totalErrors + totalWarnings,
      errors: totalErrors,
      warnings: totalWarnings,
      suitesTotal: results.length,
      suitesPassed,
      suitesFailed: results.length - suitesPassed,
      byCategory: codeAuditDetails?.summary?.byCategory ?? {}
    },
    suites: results.map(r => ({
      name: r.name,
      status: r.success ? 'passed' : 'failed',
      exitCode: r.exitCode,
      durationMs: r.durationMs,
      errors: r.errors,
      warnings: r.warnings
    })),
    topFiles: codeAuditDetails?.topFiles ?? [],
    files: codeAuditDetails?.files ?? {}
  };

  // Salida por defecto en stdout para IA
  if (!isHumanMode) {
    console.log(JSON.stringify(consolidatedReport, null, 2));
  } else {
    // Modo humano interactivo
    console.log(styleText('bold', '\n======================================================'));
    console.log(styleText('bold', '📊 RESUMEN FINAL DE LA AUDITORÍA COMPLETA'));
    console.log(styleText('bold', '======================================================'));

    for (const res of results) {
      const statusIcon = res.success ? `✅ ${styleText('green', 'ÉXITO')}` : `❌ ${styleText('red', 'FALLÓ')}`;
      console.log(`  ${statusIcon} | ${res.name.padEnd(38)} (${res.durationMs}ms)`);
    }

    console.log(styleText('bold', '──────────────────────────────────────────────────────'));
    console.log(`📊 TOTAL: ${totalErrors === 0 ? styleText('green', '0 Errores') : styleText('red', `${totalErrors} Errores`)} | ${styleText('yellow', `${totalWarnings} Advertencias`)} | ${suitesPassed}/${results.length} Suites aprobadas`);
    console.log(styleText('bold', '======================================================\n'));

    if (anyFailed) {
      console.log(styleText('red', '🚨 Se encontraron errores en uno o más módulos de auditoría. Revisa los logs anteriores.'));
    } else {
      console.log(styleText('green', '🎉 ¡Todas las auditorías y pruebas se ejecutaron con éxito!'));
    }
  }

  // Exportar reporte si se especificó --output
  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    if (outputPath.endsWith('.json')) {
      await fs.writeFile(outputPath, JSON.stringify(consolidatedReport, null, 2), 'utf-8');
    } else if (outputPath.endsWith('.md')) {
      let md = `# Reporte Consolidado de Auditoría Global\n\n`;
      md += `**Estado**: ${anyFailed ? '❌ Fallido' : '✅ Aprobado'}\n\n`;
      md += `| Métrica | Valor |\n| :--- | :--- |\n`;
      md += `| **Suites Aprobadas** | \`${suitesPassed} / ${results.length}\` |\n`;
      md += `| **Errores Totales** | \`${totalErrors}\` |\n`;
      md += `| **Advertencias Totales** | \`${totalWarnings}\` |\n\n`;

      md += `## 📦 Resultados por Suite de Validación\n\n| Suite | Estado | Duración | Errores | Advertencias |\n| :--- | :---: | :---: | :---: | :---: |\n`;
      for (const r of results) {
        const icon = r.success ? '✅ Pass' : '❌ Fail';
        md += `| ${r.name} | ${icon} | ${r.durationMs}ms | ${r.errors} | ${r.warnings} |\n`;
      }

      if (codeAuditDetails?.summary?.byCategory) {
        md += `\n## 📊 Desglose de Reglas de Código\n\n| Categoría | Cantidad |\n| :--- | :---: |\n`;
        Object.entries(codeAuditDetails.summary.byCategory as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .forEach(([cat, count]) => {
            md += `| ${cat} | ${count} |\n`;
          });
      }

      await fs.writeFile(outputPath, md, 'utf-8');
    } else {
      const lines = results.map(r => `[${r.success ? 'SUCCESS' : 'FAILED'}] ${r.name} (${r.durationMs}ms) - Errors: ${r.errors}, Warnings: ${r.warnings}`);
      await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    }
    logProgress(styleText('cyan', `✨ Reporte completo escrito en: ${values.output}`));
  }

  if (anyFailed) {
    process.exit(1);
  }
}

runAllAudits().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal en audit_full: ${(err as Error).message}`));
  process.exit(1);
});

