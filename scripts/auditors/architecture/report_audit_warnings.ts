import fs from 'node:fs';
import path from 'node:path';
import type { AuditExecutionStatus, FindingSeverity } from '../../lib/auditContract.ts';

const RADIX_DECIMAL = 10;
const DEFAULT_TOP_LIMIT = 20;

interface Finding {
  severity: FindingSeverity;
  message: string;
  file?: string;
  line?: number;
  context?: string;
  ruleId?: string;
}

interface SuiteResult {
  id: string;
  name: string;
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

function parseReportOptions() {
  const argv = process.argv.slice(2);
  let category = 'all';
  let top = DEFAULT_TOP_LIMIT;
  let jsonOutput = false;

  for (const arg of argv) {
    if (arg === 'json' || arg === '--json') jsonOutput = true;
    else if (arg.startsWith('category=')) category = arg.slice(9).toLowerCase(); // no-magic
    else if (arg.startsWith('top=')) top = parseInt(arg.slice(4), RADIX_DECIMAL) || DEFAULT_TOP_LIMIT; // no-magic
    else if (!arg.startsWith('-')) category = arg.toLowerCase();
  }

  return { category, top, jsonOutput };
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

export function runReport() {
  const args = parseReportOptions();
  const report = loadAuditReport();
  if (!report) process.exit(1);

  const categoryCounts: Record<string, { errors: number; warnings: number; findings: Finding[] }> = {};

  for (const fam of Object.values(report.families)) {
    for (const suite of fam.suites) {
      for (const finding of suite.findings) {
        const catKey = finding.ruleId || suite.name;
        if (!categoryCounts[catKey]) {
          categoryCounts[catKey] = { errors: 0, warnings: 0, findings: [] };
        }
        if (finding.severity === 'error') {
          categoryCounts[catKey].errors++;
        } else {
          categoryCounts[catKey].warnings++;
        }
        categoryCounts[catKey].findings.push(finding);
      }
    }
  }

  if (args.jsonOutput) {
    console.log(JSON.stringify({ summary: report.summary, categories: categoryCounts }, null, 2));
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               REPORTE CONSOLIDADO DE ADVERTENCIAS Y ERRORES DE AUDITORÍA                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Estado: ${report.status === 'passed' ? '✅ PASSED' : '❌ FAILED'} | Suites: ${report.summary.suitesPassed}/${report.summary.suitesTotal}`);
  console.log(`🚨 Errores Críticos: ${report.summary.errors} | ⚠️  Advertencias Totales: ${report.summary.warnings}\n`);

  console.log('┌───────────────────────────────────────────────────────────────────┬────────┬──────────┐');
  console.log('│ CATEGORÍA / REGLA DE AUDITORÍA                                    │ ERRORES│ WARNINGS │');
  console.log('├───────────────────────────────────────────────────────────────────┼────────┼──────────┤');

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => {
    const totalB = b[1].errors * 1000 + b[1].warnings;
    const totalA = a[1].errors * 1000 + a[1].warnings;
    return totalB - totalA;
  });

  for (const [catName, data] of sortedCategories) {
    const truncatedCat = catName.length > 65 ? catName.substring(0, 62) + '...' : catName.padEnd(65);
    const errStr = String(data.errors).padStart(6);
    const warnStr = String(data.warnings).padStart(8);
    console.log(`│ ${truncatedCat} │ ${errStr} │ ${warnStr} │`);
  }
  console.log('└───────────────────────────────────────────────────────────────────┴────────┴──────────┘\n');

  if (args.category !== 'all') {
    const cleanArg = args.category.replace(/[-_]/g, ' ').toLowerCase();
    const target = sortedCategories.find(([name]) => name.toLowerCase().replace(/[-_]/g, ' ').includes(cleanArg));
    if (target) {
      const [catName, data] = target;
      console.log(`\n🔍 Muestra de hallazgos para categoría "${catName}" (Top ${args.top}):\n`);
      const sample = data.findings.slice(0, args.top);
      sample.forEach((f, idx) => {
        const fileLoc = f.file ? `${path.relative(process.cwd(), f.file)}${f.line ? `:${f.line}` : ''}` : 'General';
        console.log(`  ${idx + 1}. [${f.severity.toUpperCase()}] ${fileLoc}`);
        console.log(`     ${f.message}`);
      });
      console.log('');
    } else {
      console.log(`\n⚠️  No se encontraron hallazgos para la categoría "${args.category}". Categorías disponibles:`);
      sortedCategories.forEach(([name]) => console.log(`  • ${name}`));
      console.log('');
    }
  }
}

runReport();
