import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import type { AuditExecutionStatus, FindingSeverity } from '../../lib/auditContract.ts';
import { renderBanner, renderBoxTable, type TableColumn } from '../../lib/unifiedTheme.ts';

const RADIX_DECIMAL = 10;
const DEFAULT_TOP_LIMIT = 20;
const DEFAULT_SAMPLE_ERROR_LIMIT = 5;
const ERROR_WEIGHT_FACTOR = 1000;

interface Finding {
  severity: FindingSeverity;
  message: string;
  file?: string;
  line?: number;
  context?: string;
  ruleId?: string;
  ruleDescription?: string;
}

interface SuiteResult {
  id: string;
  name: string;
  description?: string;
  family: string;
  status: AuditExecutionStatus;
  findings: Finding[];
}

interface FamilyResult {
  title: string;
  suites: SuiteResult[];
}

interface AuditReport {
  status: AuditExecutionStatus;
  summary: {
    totalViolations: number;
    errors: number;
    warnings: number;
    suitesTotal: number;
    suitesPassed: number;
    suitesFailed: number;
    durationMs: number;
  };
  families: Record<string, FamilyResult>;
}

export type SeverityFilter = 'all' | 'error' | 'warning';

interface ReportOptions {
  category: string;
  severity: SeverityFilter;
  search: string;
  filePattern: string;
  top: number | 'all';
  jsonOutput: boolean;
  summaryOnly: boolean;
  filesOnly: boolean;
}

function parseReportOptions(): ReportOptions {
  const argv = process.argv.slice(2);
  let category = 'all';
  let severity: SeverityFilter = 'all';
  let search = '';
  let filePattern = '';
  let top: number | 'all' = DEFAULT_TOP_LIMIT;
  let jsonOutput = false;
  let summaryOnly = false;
  let filesOnly = false;

  for (const arg of argv) {
    if (arg === 'json' || arg === '--json' || arg === 'json=true') {
      jsonOutput = true;
    } else if (arg === 'summary' || arg === '--summary' || arg === 'summary=true') {
      summaryOnly = true;
    } else if (arg === 'files' || arg === '--files' || arg === 'files=true') {
      filesOnly = true;
    } else if (arg === 'errors' || arg === 'error' || arg === 'severity=error') {
      severity = 'error';
    } else if (arg === 'warnings' || arg === 'warning' || arg === 'severity=warning') {
      severity = 'warning';
    } else if (arg.startsWith('severity=')) {
      const val = arg.slice(9).toLowerCase();
      if (val === 'error' || val === 'warning' || val === 'all') {
        severity = val;
      }
    } else if (arg.startsWith('category=')) {
      category = arg.slice(9).toLowerCase();
    } else if (arg.startsWith('search=')) {
      search = arg.slice(7).toLowerCase();
    } else if (arg.startsWith('file=')) {
      filePattern = arg.slice(5).toLowerCase();
    } else if (arg.startsWith('top=')) {
      const topVal = arg.slice(4).toLowerCase();
      top = topVal === 'all' || topVal === '0' ? 'all' : (parseInt(topVal, RADIX_DECIMAL) || DEFAULT_TOP_LIMIT);
    } else if (!arg.startsWith('-')) {
      category = arg.toLowerCase();
    }
  }

  return { category, severity, search, filePattern, top, jsonOutput, summaryOnly, filesOnly };
}

function loadAuditReport(): AuditReport | null {
  const reportPath = path.resolve(process.cwd(), 'scratch/audits/latest_audit.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ No se encontró scratch/audits/latest_audit.json. Ejecuta primero "npm run audit".');
    return null;
  }
  try {
    const raw = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(raw) as AuditReport;
  } catch (e) {
    console.error(`❌ Error al parsear scratch/audits/latest_audit.json: ${(e as Error).message}`);
    return null;
  }
}

export function runReport(): void {
  const args = parseReportOptions();
  const report = loadAuditReport();
  if (!report) process.exit(1);

  const categoryCounts: Record<string, { errors: number; warnings: number; findings: Finding[] }> = {};
  const allFindings: Finding[] = [];

  for (const fam of Object.values(report.families)) {
    for (const suite of fam.suites) {
      for (const finding of suite.findings) {
        const catKey = finding.ruleDescription || suite.description || finding.ruleId || suite.name;
        if (!categoryCounts[catKey]) {
          categoryCounts[catKey] = { errors: 0, warnings: 0, findings: [] };
        }
        if (finding.severity === 'error') {
          categoryCounts[catKey].errors++;
        } else {
          categoryCounts[catKey].warnings++;
        }
        categoryCounts[catKey].findings.push(finding);
        allFindings.push(finding);
      }
    }
  }

  const matchesFilters = (f: Finding, catKey: string): boolean => {
    if (args.severity !== 'all' && f.severity !== args.severity) return false;
    if (args.filePattern && (!f.file || !f.file.toLowerCase().includes(args.filePattern))) return false;
    if (args.search) {
      const inMsg = f.message.toLowerCase().includes(args.search);
      const inFile = f.file ? f.file.toLowerCase().includes(args.search) : false;
      const inRule = (f.ruleId && f.ruleId.toLowerCase().includes(args.search)) ||
                     (f.ruleDescription && f.ruleDescription.toLowerCase().includes(args.search)) ||
                     catKey.toLowerCase().includes(args.search);
      if (!inMsg && !inFile && !inRule) return false;
    }
    return true;
  };

  const filteredCategories: Record<string, { errors: number; warnings: number; findings: Finding[] }> = {};
  const matchingFindings: Finding[] = [];

  for (const [catName, data] of Object.entries(categoryCounts)) {
    const matchingInCat = data.findings.filter(f => matchesFilters(f, catName));
    if (matchingInCat.length > 0) {
      filteredCategories[catName] = {
        errors: matchingInCat.filter(f => f.severity === 'error').length,
        warnings: matchingInCat.filter(f => f.severity === 'warning').length,
        findings: matchingInCat
      };
      matchingFindings.push(...matchingInCat);
    }
  }

  if (args.jsonOutput) {
    const fileMap: Record<string, { errors: number; warnings: number }> = {};
    for (const f of matchingFindings) {
      const relPath = f.file ? path.relative(process.cwd(), f.file) : 'General';
      if (!fileMap[relPath]) {
        fileMap[relPath] = { errors: 0, warnings: 0 };
      }
      if (f.severity === 'error') {
        fileMap[relPath].errors++;
      } else {
        fileMap[relPath].warnings++;
      }
    }
    console.log(JSON.stringify({
      summary: report.summary,
      filteredTotal: matchingFindings.length,
      findings: args.top === 'all' ? matchingFindings : matchingFindings.slice(0, args.top),
      categories: filteredCategories,
      ...(args.filesOnly ? { files: fileMap } : {})
    }, null, 2));
    return;
  }

  if (args.filesOnly) {
    const fileMap: Record<string, { errors: number; warnings: number }> = {};
    for (const f of matchingFindings) {
      const relPath = f.file ? path.relative(process.cwd(), f.file) : 'General';
      if (!fileMap[relPath]) {
        fileMap[relPath] = { errors: 0, warnings: 0 };
      }
      if (f.severity === 'error') {
        fileMap[relPath].errors++;
      } else {
        fileMap[relPath].warnings++;
      }
    }

    const sortedFiles = Object.entries(fileMap).sort((a, b) => {
      const totalB = b[1].errors * ERROR_WEIGHT_FACTOR + b[1].warnings;
      const totalA = a[1].errors * ERROR_WEIGHT_FACTOR + a[1].warnings;
      return totalB - totalA;
    });

    const filesToDisplay = args.top === 'all' ? sortedFiles : sortedFiles.slice(0, args.top);

    console.log('\n' + renderBanner(
      'ARCHIVOS CON HALLAZGOS DE AUDITORÍA',
      `Estado: ${report.status === 'passed' ? 'PASSED' : 'FAILED'} | Archivos afectados: ${sortedFiles.length}`
    ));

    interface FileFindingRow {
      file: string;
      errors: string;
      warnings: string;
    }

    const fileCols: readonly TableColumn<FileFindingRow>[] = [
      { header: 'ARCHIVO AFECTADO', width: 52, align: 'left', key: 'file' },
      { header: 'ERRORES', width: 9, align: 'right', key: 'errors' },
      { header: 'WARNINGS', width: 9, align: 'right', key: 'warnings' }
    ];

    const fileRows: FileFindingRow[] = filesToDisplay.map(([filePath, data]) => ({
      file: filePath,
      errors: data.errors > 0 ? styleText('red', String(data.errors)) : styleText('dim', '0'),
      warnings: data.warnings > 0 ? styleText('yellow', String(data.warnings)) : styleText('dim', '0')
    }));

    console.log('\n' + renderBoxTable(fileCols, fileRows));
    console.log('');
    return;
  }

  console.log('\n' + renderBanner(
    'REPORTE CONSOLIDADO DE ADVERTENCIAS Y ERRORES',
    `Estado: ${report.status === 'passed' ? 'PASSED' : 'FAILED'} | Suites: ${report.summary.suitesPassed}/${report.summary.suitesTotal}`
  ));

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => {
    const totalB = b[1].errors * ERROR_WEIGHT_FACTOR + b[1].warnings;
    const totalA = a[1].errors * ERROR_WEIGHT_FACTOR + a[1].warnings;
    return totalB - totalA;
  });

  interface CategoryRow {
    category: string;
    errors: string;
    warnings: string;
  }

  const catCols: readonly TableColumn<CategoryRow>[] = [
    { header: 'CATEGORÍA / REGLA DE AUDITORÍA', width: 52, align: 'left', key: 'category' },
    { header: 'ERRORES', width: 9, align: 'right', key: 'errors' },
    { header: 'WARNINGS', width: 9, align: 'right', key: 'warnings' }
  ];

  const catRows: CategoryRow[] = sortedCategories.map(([catName, data]) => ({
    category: catName,
    errors: data.errors > 0 ? styleText('red', String(data.errors)) : styleText('dim', '0'),
    warnings: data.warnings > 0 ? styleText('yellow', String(data.warnings)) : styleText('dim', '0')
  }));

  console.log('\n' + renderBoxTable(catCols, catRows));
  console.log('');

  if (args.summaryOnly) return;

  if (args.category !== 'all') {
    const cleanArg = args.category.replace(/[-_]/g, ' ').toLowerCase();
    const target = sortedCategories.find(([name]) => name.toLowerCase().replace(/[-_]/g, ' ').includes(cleanArg));
    if (target) {
      const [catName, data] = target;
      const filtered = data.findings.filter(f => matchesFilters(f, catName));
      const limit = args.top === 'all' ? filtered.length : args.top;
      console.log(`\n🔍 Muestra de hallazgos para categoría "${catName}" (Mostrando ${Math.min(limit, filtered.length)} de ${filtered.length}):\n`);
      const sample = filtered.slice(0, limit);
      sample.forEach((f, idx) => {
        const fileLoc = f.file ? `${path.relative(process.cwd(), f.file)}${f.line ? `:${f.line}` : ''}` : 'General';
        console.log(`  ${idx + 1}. [${f.severity.toUpperCase()}] ${fileLoc}`);
        console.log(`     ${f.message}`);
        if (f.context) console.log(`     Contexto: ${f.context}`);
      });
      console.log('');
    } else {
      console.log(`\n⚠️  No se encontraron hallazgos para la categoría "${args.category}". Categorías disponibles:`);
      sortedCategories.forEach(([name]) => console.log(`  • ${name}`));
      console.log('');
    }
  } else if (args.search || args.filePattern || args.severity !== 'all') {
    const limit = args.top === 'all' ? matchingFindings.length : args.top;
    console.log(`\n🔍 Hallazgos filtrados (Filtros activos: severity=${args.severity}, search="${args.search}", file="${args.filePattern}"): ${Math.min(limit, matchingFindings.length)} de ${matchingFindings.length}\n`);
    const sample = matchingFindings.slice(0, limit);
    sample.forEach((f, idx) => {
      const fileLoc = f.file ? `${path.relative(process.cwd(), f.file)}${f.line ? `:${f.line}` : ''}` : 'General';
      const ruleTag = f.ruleDescription ? `[${f.ruleDescription}] ` : (f.ruleId ? `[${f.ruleId}] ` : '');
      console.log(`  ${idx + 1}. [${f.severity.toUpperCase()}] ${fileLoc}: ${ruleTag}${f.message}`);
    });
    console.log('');
  } else {
    const allErrors: Finding[] = [];
    for (const fam of Object.values(report.families)) {
      for (const suite of fam.suites) {
        for (const finding of suite.findings) {
          if (finding.severity === 'error') {
            allErrors.push(finding);
          }
        }
      }
    }

    if (allErrors.length > 0) {
      const sampleErrors = allErrors.slice(-DEFAULT_SAMPLE_ERROR_LIMIT);
      console.log(`❌ Muestra de errores detectados (últimos ${sampleErrors.length} de ${allErrors.length}):\n`);
      sampleErrors.forEach((f, idx) => {
        const fileLoc = f.file ? `${path.relative(process.cwd(), f.file)}${f.line ? `:${f.line}` : ''}` : 'General';
        const cleanMsg = f.message.replace(/^Sugerencia de calidad \(Fallow\):\s*/i, '');
        const normalizedRuleDesc = (f.ruleDescription || '').replace(/^Fallow:\s*/i, '').trim().toLowerCase();
        const ruleTag = f.ruleDescription && !cleanMsg.toLowerCase().includes(normalizedRuleDesc)
          ? `[${f.ruleDescription}] `
          : (f.ruleDescription?.startsWith('Fallow:') ? '[Fallow] ' : (f.ruleId ? `[${f.ruleId}] ` : ''));
        console.log(`  ${idx + 1}. ${fileLoc}: ${ruleTag}${cleanMsg}`);
      });
      console.log('');
    }
  }
}

runReport();
