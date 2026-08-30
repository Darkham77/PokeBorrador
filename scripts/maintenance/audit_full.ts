// fallow-ignore-file security-sink
/**
 * scripts/maintenance/audit_full.ts
 * 
 * MASTER AUDIT ORCHESTRATOR & UNIFIED RUNNER (Node.js 26+)
 * Dynamically discovers and executes all sub-auditors in scripts/auditors/:
 *   1. Displays formatted step-by-step progress with clean newlines.
 *   2. Renders the complete Box-Drawing summary table grouped by family.
 *   3. Persists the complete structured JSON report to scratch/audits/latest_audit.json.
 */

import { spawnSync } from 'node:child_process';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  type StandardAuditResult,
  type AuditFinding,
  type AuditFamily,
  FAMILY_METADATA,
  AUDIT_FAMILIES
} from '../lib/auditContract.ts';
import {
  renderBanner,
  renderFamilyHeader,
  renderAuditTaskRow,
  renderConsolidatedFooter,
  renderMarkdownReport
} from '../lib/unifiedTheme.ts';
import { discoverAuditors } from './auditScanner.ts';

enableCompileCache();

async function runMasterAudit() {
  const startTime = performance.now();
  const args = process.argv.slice(2);
  const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : (['errors-only', 'fix'].includes(a) ? `--${a}` : a));

  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      family: { type: 'string' },
      task: { type: 'string' },
      output: { type: 'string', short: 'o' },
      'changed-since': { type: 'string' },
      'errors-only': { type: 'boolean' },
      top: { type: 'string', short: 't' },
      rule: { type: 'string', short: 'r', multiple: true },
      rules: { type: 'string', multiple: true }
    },
    allowPositionals: true,
    strict: false
  });

  const positionalFamily = positionals.find(p => (AUDIT_FAMILIES as readonly string[]).includes(p)); // domain-ok
  const targetFamily = values.family || positionalFamily;

  const rawRuleArgs: string[] = []; // no-domain
  if (values.rule) {
    if (Array.isArray(values.rule)) {
      for (const item of values.rule) rawRuleArgs.push(String(item));
    } else {
      rawRuleArgs.push(String(values.rule));
    }
  }
  if (values.rules) {
    if (Array.isArray(values.rules)) {
      for (const item of values.rules) rawRuleArgs.push(String(item));
    } else {
      rawRuleArgs.push(String(values.rules));
    }
  }
  for (const pos of positionals) {
    if (pos.toLowerCase() === 'dox' || pos.includes(',')) { // string-ok
      rawRuleArgs.push(pos);
    }
  }
  const formattedRules = rawRuleArgs.join(',');

  // 1. Prepare clean scratch/audits directory structure
  const scratchAuditsDir = path.resolve(process.cwd(), 'scratch/audits');
  await fs.mkdir(scratchAuditsDir, { recursive: true });
  for (const family of AUDIT_FAMILIES) {
    await fs.mkdir(path.join(scratchAuditsDir, family), { recursive: true });
  }

  // 2. Auto-discover all auditor tasks dynamically from scripts/auditors/
  const tasksToRun = await discoverAuditors({
    family: targetFamily as string | undefined,
    task: values.task as string | undefined
  });

  // Sort tasks by canonical family order
  tasksToRun.sort((a, b) => {
    const orderA = AUDIT_FAMILIES.indexOf(a.family);
    const orderB = AUDIT_FAMILIES.indexOf(b.family);
    return orderA - orderB;
  });

  console.log(renderBanner(
    'POKE VICIO - SUITE DE AUDITORÍA GLOBAL Y VALIDACIÓN',
    `Auto-descubiertas: ${tasksToRun.length} suites${values.family ? `  |  Familia: ${String(values.family).toUpperCase()}` : ''}`
  ));

  if (tasksToRun.length === 0) {
    console.log(styleText('yellow', '⚠️ No se encontraron auditores que coincidan con los filtros especificados.'));
    process.exit(0);
  }

  console.log(styleText('bold', '⏳ Progreso de ejecución de suites:\n'));

  const results: StandardAuditResult[] = [];
  const totalTasks = tasksToRun.length;

  for (let i = 0; i < totalTasks; i++) {
    const task = tasksToRun[i]!;
    const stepNum = i + 1;
    const stepStr = String(stepNum).padStart(2, '0');
    const totalStr = String(totalTasks).padStart(2, '0');
    const pct = Math.round((stepNum / totalTasks) * 100);
    const pctStr = `${pct}%`.padStart(4, ' ');

    console.log(`  ${styleText('dim', `[ ${stepStr}/${totalStr} │ ${pctStr} ]`)} ⚙️  ${styleText('cyan', task.name)} ${styleText('dim', `(${task.id})`)}...`);

    const taskArgs = [...task.args];
    if (values['errors-only'] && !taskArgs.includes('--errors-only')) taskArgs.push('--errors-only');
    if (formattedRules && !taskArgs.includes('--rule')) taskArgs.push('--rule', formattedRules);
    if (values.top && !taskArgs.includes('--top')) taskArgs.push('--top', values.top as string);
    if (values['changed-since'] && !taskArgs.includes('--changed-since')) taskArgs.push('--changed-since', values['changed-since'] as string);

    const taskStart = performance.now();
    const proc = spawnSync(task.command, taskArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: task.shell ?? false,
      encoding: 'utf-8',
      timeout: task.timeoutMs ?? 60000,
      env: {
        ...process.env,
        AUDIT_SUBPROCESS: 'true'
      }
    });
    const taskDuration = Math.round(performance.now() - taskStart);

    let parsedResult: StandardAuditResult | null = null;
    const taskJsonPath = path.join(scratchAuditsDir, task.family, `${task.id}.json`);

    // Try reading the JSON directly written by sub-auditor
    try {
      const fileContent = await fs.readFile(taskJsonPath, 'utf-8');
      parsedResult = JSON.parse(fileContent) as StandardAuditResult;
      parsedResult.durationMs = taskDuration;
    } catch {
      // Fallback: parse from stdout if file read failed
      if (proc.stdout) {
        try {
          const raw = proc.stdout.trim();
          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            parsedResult = JSON.parse(raw.substring(firstBrace, lastBrace + 1)) as StandardAuditResult;
          }
        } catch {
          // Handled below
        }
      }
    }

    if (!parsedResult) {
      const isSuccess = proc.status === 0;
      const findings: AuditFinding[] = [];
      const stderr = (proc.stderr || '').trim();
      const stdout = (proc.stdout || '').trim();

      if (!isSuccess) {
        const errorMsg = stderr || stdout.split('\n')[0] || `Código de salida ${proc.status}`;
        findings.push({
          severity: 'error',
          message: errorMsg,
          file: task.scriptPath
        });
      }

      parsedResult = {
        id: task.id,
        name: task.name,
        family: task.family,
        status: isSuccess ? 'passed' : 'failed',
        durationMs: taskDuration,
        metrics: {},
        findings,
        summary: {
          errors: isSuccess ? 0 : 1,
          warnings: 0,
          info: 0
        }
      };
    }

    if (!parsedResult.summary) {
      const errCount = parsedResult.findings?.filter(f => f.severity === 'error').length ?? (parsedResult.status === 'failed' ? 1 : 0);
      const warnCount = parsedResult.findings?.filter(f => f.severity === 'warning').length ?? 0;
      parsedResult.summary = {
        errors: errCount,
        warnings: warnCount,
        info: 0
      };
    }

    results.push(parsedResult);
  }

  const totalDuration = Math.round(performance.now() - startTime);
  const totalErrors = results.reduce((acc, r) => acc + (r.summary?.errors ?? 0), 0);
  const totalWarnings = results.reduce((acc, r) => acc + (r.summary?.warnings ?? 0), 0);
  const suitesPassed = results.filter(r => r.status === 'passed' && (r.summary?.errors ?? 0) === 0).length;
  const anyFailed = totalErrors > 0 || suitesPassed < results.length;

  // Group results by family for visual presentation and JSON report
  const byFamily = new Map<AuditFamily, StandardAuditResult[]>();
  for (const f of AUDIT_FAMILIES) {
    byFamily.set(f, []);
  }
  for (const r of results) {
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family)!.push(r);
  }

  console.log('\n' + styleText('bold', '📊 RESULTADOS CONSOLIDADOS POR FAMILIA:'));

  for (const familyKey of AUDIT_FAMILIES) {
    const familyTasks = byFamily.get(familyKey) || [];
    if (familyTasks.length === 0) continue;

    const meta = FAMILY_METADATA[familyKey]!;
    console.log(renderFamilyHeader(meta));

    for (const taskResult of familyTasks) {
      console.log(renderAuditTaskRow(taskResult));
    }
  }

  // 3. Consolidated Footer
  const allErrorFindings = results.flatMap(r => r.findings || []).filter(f => f.severity === 'error');
  console.log(renderConsolidatedFooter(
    results.length,
    suitesPassed,
    totalErrors,
    totalWarnings,
    totalDuration,
    allErrorFindings
  ));

  // 4. Always save complete machine-readable report to scratch/audits/
  const consolidatedReport = {
    status: anyFailed ? 'failed' : 'passed',
    summary: {
      totalViolations: totalErrors + totalWarnings,
      errors: totalErrors,
      warnings: totalWarnings,
      suitesTotal: results.length,
      suitesPassed,
      suitesFailed: results.length - suitesPassed,
      durationMs: totalDuration
    },
    families: Object.fromEntries(
      AUDIT_FAMILIES.map(f => [
        f,
        {
          title: FAMILY_METADATA[f]?.title ?? f,
          suites: byFamily.get(f) ?? []
        }
      ])
    ),
    allFindings: results.flatMap(r => r.findings)
  };

  const latestAuditPath = path.join(scratchAuditsDir, 'latest_audit.json');
  const latestSummaryPath = path.join(scratchAuditsDir, 'latest_summary.json');

  await fs.writeFile(latestAuditPath, JSON.stringify(consolidatedReport, null, 2), 'utf-8');
  await fs.writeFile(latestSummaryPath, JSON.stringify({
    status: consolidatedReport.status,
    summary: consolidatedReport.summary,
    suites: results.map(r => ({
      id: r.id,
      name: r.name,
      family: r.family,
      status: r.status,
      durationMs: r.durationMs,
      metrics: r.metrics,
      errors: r.summary.errors,
      warnings: r.summary.warnings
    }))
  }, null, 2), 'utf-8');

  console.log(styleText('dim', `💾 Reporte detallado para IA / herramientas disponible en:`));
  console.log(styleText('cyan', `   📄 ${path.relative(process.cwd(), latestAuditPath)}\n`));

  // 5. Export report if --output is specified
  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    if (outputPath.endsWith('.json')) {
      await fs.writeFile(outputPath, JSON.stringify(consolidatedReport, null, 2), 'utf-8');
    } else if (outputPath.endsWith('.md')) {
      const md = renderMarkdownReport(results, suitesPassed, totalDuration);
      await fs.writeFile(outputPath, md, 'utf-8');
    } else {
      const lines = results.map(r => `[${r.status.toUpperCase()}] ${r.name} (${r.durationMs}ms) - Errors: ${r.summary.errors}, Warnings: ${r.summary.warnings}`);
      await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    }
    console.log(styleText('cyan', `✨ Reporte exportado en: ${values.output}\n`));
  }

  if (anyFailed) {
    process.exit(1);
  }
}

runMasterAudit().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal en audit_full: ${(err as Error).message}`));
  process.exit(1);
});
