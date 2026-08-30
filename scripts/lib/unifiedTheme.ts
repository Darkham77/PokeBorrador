// fallow-ignore-file security-sink
/**
 * scripts/lib/unifiedTheme.ts
 * 
 * UNIFIED CLI & REPORT THEME ENGINE (Node.js 26+)
 * Provides the single source of truth for visual presentation, Unicode Box-Drawing,
 * fixed-width column alignment, status badges, and Markdown generation.
 */

import { styleText } from 'node:util';
import path from 'node:path';
import {
  type StandardAuditResult,
  type AuditFinding,
  type FamilyMetadata,
  type AuditFamily,
  FAMILY_METADATA
} from './auditContract.ts';

const TERMINAL_WIDTH = 80;

export function renderBanner(title: string, subtitle?: string): string {
  const line = '═'.repeat(TERMINAL_WIDTH - 4);
  const lines: string[] = [];
  lines.push(styleText('cyan', `╔═${line}═╗`));
  lines.push(styleText('cyan', `║  ${styleText(['bold', 'white'], title.padEnd(TERMINAL_WIDTH - 6))}  ║`));
  if (subtitle) {
    lines.push(styleText('cyan', `║  ${styleText('dim', subtitle.padEnd(TERMINAL_WIDTH - 6))}  ║`));
  }
  lines.push(styleText('cyan', `╚═${line}═╝`));
  return lines.join('\n');
}

export function renderFamilyHeader(meta: FamilyMetadata): string {
  const line = '─'.repeat(TERMINAL_WIDTH - 8);
  return styleText('bold', `\n${meta.icon} [FAMILIA ${meta.order}] ${meta.title}\n${styleText('dim', `  ${line}`)}`);
}

export function formatStatusBadge(status: 'passed' | 'failed' | 'warning' | 'info'): string {
  switch (status) {
    case 'passed':
      return `[ ${styleText('green', '✅ PASS')} ]`;
    case 'failed':
      return `[ ${styleText('red', '❌ FAIL')} ]`;
    case 'warning':
      return `[ ${styleText('yellow', '⚠️ WARN')} ]`;
    case 'info':
      return `[ ${styleText('cyan', 'ℹ️ INFO')} ]`;
  }
}

export function formatDuration(ms: number): string {
  const str = `${ms}ms`;
  return str.padStart(7);
}

export function renderAuditTaskRow(res: StandardAuditResult): string {
  const errors = res.summary?.errors ?? (res.status === 'failed' ? 1 : 0);
  const warnings = res.summary?.warnings ?? 0;
  const badge = res.status === 'passed' ? formatStatusBadge(errors > 0 ? 'failed' : (warnings > 0 ? 'warning' : 'passed')) : formatStatusBadge('failed');
  const nameStr = res.name.padEnd(38);
  const durationStr = formatDuration(res.durationMs);

  // Extract first primary metric string if present
  let primaryMetric = '';
  const entries = Object.entries(res.metrics || {});
  if (entries.length > 0) {
    const [k, v] = entries[0]!;
    primaryMetric = `${v} ${k.split(' ')[0] ?? ''}`.trim();
  }
  const metricStr = primaryMetric ? primaryMetric.padEnd(14) : '              ';

  const errStr = errors > 0 ? styleText('red', `${errors} ❌`.padStart(6)) : styleText('dim', '0 ❌'.padStart(6));
  const warnStr = warnings > 0 ? styleText('yellow', `${warnings} ⚠️`.padStart(6)) : styleText('dim', '0 ⚠️'.padStart(6));

  return `  ${badge} │ ${styleText('bold', nameStr)} │ ${styleText('dim', durationStr)} │ ${metricStr} │ ${errStr} │ ${warnStr}`;
}

const DEFAULT_MAX_FINDINGS_PREVIEW = 30; // no-magic

export function renderFindingsDetail(findings: AuditFinding[], maxLimit: number = DEFAULT_MAX_FINDINGS_PREVIEW): string {
  if (!Array.isArray(findings) || findings.length === 0) return '';

  const lines: string[] = [];
  const byFile = new Map<string, AuditFinding[]>();

  for (const rawF of findings) {
    if (!rawF) continue;
    const f: AuditFinding = typeof rawF === 'string' ? { severity: 'error', message: rawF } : rawF;
    const fileKey = f.file ? path.relative(process.cwd(), f.file) : 'Global';
    if (!byFile.has(fileKey)) byFile.set(fileKey, []);
    byFile.get(fileKey)!.push(f);
  }

  let shown = 0;
  for (const [file, items] of byFile) {
    if (shown >= maxLimit) break;
    lines.push(`\n  📄 ${styleText('bold', file)} (${items.length} incidencia${items.length === 1 ? '' : 's'}):`);

    for (const item of items) {
      if (shown >= maxLimit) break;
      shown++;

      const icon = item.severity === 'error' ? styleText('red', '❌ ERR ') : styleText('yellow', '⚠️ WARN');
      const lineNum = item.line !== undefined ? `L${item.line}`.padEnd(6) : '      ';
      const ruleTag = item.ruleId ? `[${item.ruleId}] ` : '';
      const contextSnippet = item.context ? ` (${styleText('dim', `"${item.context}"`)})` : '';

      lines.push(`    ${lineNum} ${icon} ${ruleTag}${item.message}${contextSnippet}`);
    }
  }

  if (findings.length > maxLimit) {
    lines.push(styleText('cyan', `\n  ... y ${findings.length - maxLimit} incidencia(s) más. Usa --output=<archivo> para volcado completo.`));
  }

  return lines.join('\n');
}

export function renderConsolidatedFooter(
  suitesTotal: number,
  suitesPassed: number,
  totalErrors: number,
  totalWarnings: number,
  totalDurationMs: number,
  errorFindings?: AuditFinding[]
): string {
  const line = '═'.repeat(TERMINAL_WIDTH - 4);
  const lines: string[] = [];
  lines.push(styleText('bold', `\n╠═${line}═╣`));

  const statusText = totalErrors === 0 
    ? styleText(['bold', 'green'], '🎉 ¡SUITE DE AUDITORÍA GLOBAL APROBADA!') 
    : styleText(['bold', 'red'], '🚨 AUDITORÍA GLOBAL CON ERRORES CRÍTICOS');

  lines.push(`  ${statusText}`);
  lines.push(styleText('dim', `  Duración Total: ${totalDurationMs}ms | Suites: ${suitesPassed}/${suitesTotal} Aprobadas`));
  lines.push(`  Errores: ${totalErrors === 0 ? styleText('green', '0') : styleText('red', String(totalErrors))}  |  Advertencias: ${totalWarnings === 0 ? styleText('green', '0') : styleText('yellow', String(totalWarnings))}`);

  if (errorFindings && errorFindings.length > 0) {
    const sampleErrors = errorFindings.slice(0, 5);
    lines.push(styleText('bold', `\n  ❌ Muestra de errores detectados (primeros ${sampleErrors.length}):`));
    for (let i = 0; i < sampleErrors.length; i++) {
      const err = sampleErrors[i]!;
      const fileInfo = err.file ? (err.line ? `${err.file}:${err.line}` : err.file) : 'desconocido';
      const relFile = path.relative(process.cwd(), fileInfo).replace(/^[\\/]+/, '') || fileInfo;
      const ruleTag = err.ruleId ? `[${err.ruleId}] ` : '';
      const contextStr = err.context ? ` ("${err.context}")` : '';
      lines.push(`    ${i + 1}. ${styleText('red', relFile)}: ${ruleTag}${err.message}${contextStr}`);
    }
    if (errorFindings.length > 5) {
      lines.push(styleText('dim', `    ... y ${errorFindings.length - 5} error(es) más (ver reporte JSON completo).`));
    }
  }

  lines.push(styleText('bold', `╚═${line}═╝\n`));
  return lines.join('\n');
}

export function renderMarkdownReport(
  results: StandardAuditResult[],
  suitesPassed: number,
  totalDurationMs: number
): string {
  const totalErrors = results.reduce((acc, r) => acc + r.summary.errors, 0);
  const totalWarnings = results.reduce((acc, r) => acc + r.summary.warnings, 0);
  const isPassed = totalErrors === 0;

  let md = `# 🛡️ Reporte Consolidado de Auditoría Global\n\n`;
  md += `**Estado**: ${isPassed ? '✅ Aprobado' : '❌ Fallido'}\n`;
  md += `**Duración Total**: \`${totalDurationMs}ms\`\n`;
  md += `**Suites**: \`${suitesPassed} / ${results.length} Aprobadas\`\n`;
  md += `**Errores**: \`${totalErrors}\` | **Advertencias**: \`${totalWarnings}\`\n\n`;

  // Group by family
  const byFamily = new Map<AuditFamily, StandardAuditResult[]>(); // runtime-map
  for (const r of results) {
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family)!.push(r);
  }

  for (const [familyKey, tasks] of byFamily) {
    const meta = FAMILY_METADATA[familyKey];
    const familyTitle = meta ? `${meta.icon} Familia ${meta.order}: ${meta.title}` : familyKey;
    md += `## ${familyTitle}\n\n`;
    md += `| Estado | Auditoría | Duración | Métrica Principal | Errores | Advertencias |\n`;
    md += `| :---: | :--- | :---: | :--- | :---: | :---: |\n`;

    for (const t of tasks) {
      const icon = t.status === 'passed' && t.summary.errors === 0 ? '✅ Pass' : '❌ Fail';
      const metricEntries = Object.entries(t.metrics);
      const metricStr = metricEntries.length > 0 ? `${metricEntries[0]![1]} ${metricEntries[0]![0]}` : '-';
      md += `| ${icon} | **${t.name}** | \`${t.durationMs}ms\` | ${metricStr} | ${t.summary.errors} | ${t.summary.warnings} |\n`;
    }
    md += '\n';
  }

  // Findings section if any
  const allFindings = results.flatMap(r => r.findings);
  if (allFindings.length > 0) {
    md += `## 📋 Detalle de Incidencias\n\n`;
    md += `| Severidad | Archivo | Línea | Regla | Mensaje |\n`;
    md += `| :---: | :--- | :---: | :--- | :--- |\n`;
    for (const f of allFindings.slice(0, 100)) {
      const sevIcon = f.severity === 'error' ? '❌ Error' : '⚠️ Warn';
      const filePath = f.file ? `\`${path.relative(process.cwd(), f.file)}\`` : 'Global';
      const lineStr = f.line !== undefined ? String(f.line) : '-';
      const ruleStr = f.ruleId ? `\`${f.ruleId}\`` : '-';
      md += `| ${sevIcon} | ${filePath} | ${lineStr} | ${ruleStr} | ${f.message.replace(/\|/g, '\\|')} |\n`;
    }
    if (allFindings.length > 100) {
      md += `\n*... y ${allFindings.length - 100} incidencias más truncadas por longitud.*\n`;
    }
  }

  return md;
}
