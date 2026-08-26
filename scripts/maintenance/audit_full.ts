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
  },
  {
    name: 'Markdown Relative Links & DOX Integrity',
    command: 'node',
    args: ['--permission', '--experimental-strip-types', '--allow-fs-read=.', 'scripts/validation/validate_markdown_links.ts', '--errors-only']
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
    const tempJsonPath = 'scratch/audit_full_temp.json';
    if (task.name === 'Intelligent Project Audit') {
      if (values['changed-since']) taskArgs.push('--changed-since', values['changed-since'] as string);
      if (values['errors-only']) taskArgs.push('--errors-only');
      if (values.rule) taskArgs.push('--rule', values.rule as string);
      if (values.top) taskArgs.push('--top', values.top as string);
      taskArgs.push('--output', tempJsonPath);
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

    if (task.name === 'Intelligent Project Audit') {
      try {
        const raw = await fs.readFile(tempJsonPath, 'utf-8');
        const parsed = JSON.parse(raw) as CodeAuditReport;
        codeAuditDetails = parsed;
        errors = parsed.summary?.errors ?? (success ? 0 : 1);
        warnings = parsed.summary?.warnings ?? 0;
        await fs.rm(tempJsonPath, { force: true });
      } catch {
        if (!isHumanMode && proc.stdout) {
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
    // Modo humano interactivo con desglose por familias
    console.log(styleText('bold', '\n======================================================'));
    console.log(styleText('bold', '📊 RESUMEN FINAL DE LA AUDITORÍA COMPLETA POR FAMILIAS'));
    console.log(styleText('bold', '======================================================'));

    // 1. Familia AST y Reglas de Código
    const byCat = codeAuditDetails?.summary?.byCategory ?? {};
    const fallowCircularCount = byCat['Fallow: Dependencias circulares'] ?? 0;
    const fallowDeadFilesCount = byCat['Fallow: Archivos huérfanos / Dead Code'] ?? 0;
    const fallowDupesCount = (byCat['Fallow: Código duplicado'] ?? 0) + (byCat['Fallow: Código triplicado'] ?? 0);
    const fallowSecCount = byCat['Fallow: Vulnerabilidad de seguridad'] ?? 0;
    const fallowDeadCount = byCat['Fallow: Calidad / Dead Code'] ?? 0;
    const fallowCompCount = byCat['Fallow: Complejidad'] ?? 0;
    const lengthCount = byCat['Largo de archivo (>300/500 líneas)'] ?? 0;
    const doxCount = byCat['DOX / AGENTS.md'] ?? 0;
    
    // Reglas AST generales
    let astRuleWarnings = 0;
    for (const [cat, cnt] of Object.entries(byCat)) {
      if (!cat.startsWith('Fallow') && cat !== 'Largo de archivo (>300/500 líneas)' && cat !== 'DOX / AGENTS.md' && !cat.includes('css-checker')) {
        astRuleWarnings += cnt;
      }
    }

    const formatRow = (name: string, success: boolean, errors: number, warns: number, timeMs?: number) => {
      const icon = (success && errors === 0) ? `✅ ${styleText('green', 'ÉXITO')}` : `❌ ${styleText('red', 'FALLÓ')}`;
      const counts = warns > 0 ? styleText('yellow', ` (${warns} ⚠️)`) : '';
      const errCounts = errors > 0 ? styleText('red', ` (${errors} ❌)`) : '';
      const timeStr = timeMs !== undefined ? ` (${timeMs}ms)` : '';
      console.log(`  ${icon} | ${name.padEnd(44)} ${timeStr}${errCounts}${counts}`);
    };

    console.log(styleText('bold', '\n📁 [FAMILIA 1] ESTÁNDARES ESTÁTICOS, AST Y ARQUITECTURA:'));
    formatRow('AST & Anti-Patterns Rules', true, 0, astRuleWarnings);
    formatRow('Modularity & File Length (>300/500L)', true, 0, lengthCount);
    formatRow('DOX Hierarchy & AGENTS.md Integrity', true, 0, doxCount);
    const cssRes = results.find(r => r.name.includes('CSS/SCSS'));
    formatRow('CSS/SCSS Duplicates (css-checker)', cssRes?.success ?? true, cssRes?.errors ?? 0, cssRes?.warnings ?? 0, cssRes?.durationMs);

    console.log(styleText('bold', '\n🧠 [FAMILIA 2] FALLOW CODEBASE INTELLIGENCE:'));
    formatRow('Fallow: Dependencias Circulares', fallowCircularCount === 0, fallowCircularCount, 0);
    formatRow('Fallow: Archivos Huérfanos / Dead Code', fallowDeadFilesCount === 0, fallowDeadFilesCount, 0);
    formatRow('Fallow: Duplicación de Código (Dupes)', true, 0, fallowDupesCount);
    formatRow('Fallow: Seguridad (Vulnerabilidades CWE)', true, 0, fallowSecCount);
    formatRow('Fallow: Calidad & Dead Code', true, 0, fallowDeadCount);
    formatRow('Fallow: Complejidad Ciclomática/Cognitiva', true, 0, fallowCompCount);

    console.log(styleText('bold', '\n🔒 [FAMILIA 3] TIPOS DE DOMINIO Y DATOS CANÓNICOS:'));
    const domRes = results.find(r => r.name.includes('Domain Types'));
    const itemRes = results.find(r => r.name.includes('Items'));
    const moveRes = results.find(r => r.name.includes('Moves'));
    const abilRes = results.find(r => r.name.includes('Abilities'));
    formatRow('Domain Types Integrity', domRes?.success ?? true, domRes?.errors ?? 0, domRes?.warnings ?? 0, domRes?.durationMs);
    formatRow('Items Database Integrity', itemRes?.success ?? true, itemRes?.errors ?? 0, itemRes?.warnings ?? 0, itemRes?.durationMs);
    formatRow('Moves Database Integrity', moveRes?.success ?? true, moveRes?.errors ?? 0, moveRes?.warnings ?? 0, moveRes?.durationMs);
    formatRow('Abilities Database Integrity', abilRes?.success ?? true, abilRes?.errors ?? 0, abilRes?.warnings ?? 0, abilRes?.durationMs);

    console.log(styleText('bold', '\n💾 [FAMILIA 4] PERSISTENCIA Y MIGRACIONES:'));
    const sqlRes = results.find(r => r.name.includes('SQL Migrations'));
    const saveRes = results.find(r => r.name.includes('Save Migrations'));
    formatRow('SQL Migrations (SQLite Nativo Node 26)', sqlRes?.success ?? true, sqlRes?.errors ?? 0, sqlRes?.warnings ?? 0, sqlRes?.durationMs);
    formatRow('Save Migrations Verification', saveRes?.success ?? true, saveRes?.errors ?? 0, saveRes?.warnings ?? 0, saveRes?.durationMs);

    console.log(styleText('bold', '\n🔄 [FAMILIA 5] MÁQUINA DE ESTADOS FINITO (FSM):'));
    const fsmDiagRes = results.find(r => r.name.includes('FSM Diagrams'));
    const fsmImplRes = results.find(r => r.name.includes('FSM Implementation'));
    const fsmFlowRes = results.find(r => r.name.includes('FSM Flow Parity'));
    formatRow('FSM Diagrams (Mermaid vs TS)', fsmDiagRes?.success ?? true, fsmDiagRes?.errors ?? 0, fsmDiagRes?.warnings ?? 0, fsmDiagRes?.durationMs);
    formatRow('FSM Implementation & Dead States', fsmImplRes?.success ?? true, fsmImplRes?.errors ?? 0, fsmImplRes?.warnings ?? 0, fsmImplRes?.durationMs);
    formatRow('FSM Flow Parity (Transitions)', fsmFlowRes?.success ?? true, fsmFlowRes?.errors ?? 0, fsmFlowRes?.warnings ?? 0, fsmFlowRes?.durationMs);

    console.log(styleText('bold', '\n──────────────────────────────────────────────────────'));
    console.log(`📊 TOTAL: ${totalErrors === 0 ? styleText('green', '0 Errores') : styleText('red', `${totalErrors} Errores`)} | ${styleText('yellow', `${totalWarnings} Advertencias`)} | ${suitesPassed}/${results.length} Suites maestras aprobadas`);
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
        Object.entries(codeAuditDetails.summary.byCategory as Record<string, number>) // open-record
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

