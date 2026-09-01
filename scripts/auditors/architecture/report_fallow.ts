import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';

const DEFAULT_TOP_LIMIT = 20;
const RADIX_DECIMAL = 10;

function parseCommandLineArgs() {
  const { values, positionals } = parseArgs({
    options: {
      category: { type: 'string' },
      top: { type: 'string', default: '20' }, // no-magic
      json: { type: 'boolean', default: false }
    },
    strict: false,
    allowPositionals: true
  });

  let category = (values.category as string || '').toLowerCase();
  let top = parseInt(values.top as string, RADIX_DECIMAL) || DEFAULT_TOP_LIMIT;
  let jsonOutput = Boolean(values.json);

  for (const pos of positionals) {
    if (pos.startsWith('category=')) {
      category = pos.split('=')[1]?.toLowerCase() || ''; // domain-ok
    } else if (pos.startsWith('top=')) {
      top = parseInt(pos.split('=')[1] || '20', RADIX_DECIMAL); // no-magic
    } else if (pos === 'json') {
      jsonOutput = true;
    } else if (!category) {
      const cleanPos = pos.toLowerCase(); // domain-ok
      if (['dupes', 'duplicates', 'security', 'cwe', 'dead-code', 'deadcode', 'unused', 'complexity', 'all'].includes(cleanPos)) {
        category = cleanPos;
      }
    }
  }

  return {
    category: category || 'all',
    top,
    jsonOutput
  };
}

function runFallowCommand(command: string, extraArgs: string[] = []): Record<string, unknown> | null { // open-record
  try {
    const args = ['--format', 'json', ...extraArgs]; // no-domain
    const fallowBin = path.resolve(process.cwd(), 'node_modules/fallow/bin/fallow');
    const cmd = `node "${fallowBin}" ${command} ${args.join(' ')}`;
    const stdout = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 50 * 1024 * 1024,
      timeout: 45000,
      killSignal: 'SIGKILL'
    });
    const jsonStart = stdout.indexOf('{');
    if (jsonStart !== -1) {
      return JSON.parse(stdout.substring(jsonStart)) as Record<string, unknown>; // open-record
    }
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer };
    if (err.stdout) {
      const stdoutStr = err.stdout.toString('utf8');
      const jsonStart = stdoutStr.indexOf('{');
      if (jsonStart !== -1) {
        try {
          return JSON.parse(stdoutStr.substring(jsonStart)) as Record<string, unknown>; // open-record
        } catch {
          // Ignore parse errors on fallback
        }
      }
    }
  }
  return null;
}

function reportDupes(top: number, json: boolean): void {
  const data = runFallowCommand('dupes');
  const groups = (data?.clone_groups as Array<{ duplicated_tokens?: number; instances?: Array<{ path?: string; file?: string; line?: number; start_line?: number }> }>) || [];

  if (json) {
    console.log(JSON.stringify({ totalGroups: groups.length, groups: groups.slice(0, top) }, null, 2));
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║             REPORTE OFICIAL DE DUPLICACIÓN Y TRIPLICACIÓN DE CÓDIGO (FALLOW)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Total de grupos con código clonado: ${groups.length}`);

  if (groups.length === 0) {
    console.log('\n  ✅ ¡Excelente! No se encontraron bloques de código duplicado ni triplicado.\n');
    return;
  }

  console.log(`\n🔥 TOP ${Math.min(top, groups.length)} GRUPOS DUPLICADOS:`);
  console.log('─────────────────────────────────────────────────────────────────────────────');

  groups.slice(0, top).forEach((g, idx) => {
    const tokens = g.duplicated_tokens || 0;
    const instances = g.instances || [];
    const isTriplicate = instances.length >= 3;
    const typeLabel = isTriplicate ? 'TRIPLICADO ⚠️' : 'DUPLICADO';
    console.log(`\n  [${idx + 1}] ${typeLabel} (${tokens} tokens idénticos across ${instances.length} ubicaciones):`);
    instances.forEach(inst => {
      const p = inst.path || inst.file || '';
      const line = inst.start_line || inst.line || 0;
      console.log(`     • ${p}:${line}`);
    });
  });
  console.log('─────────────────────────────────────────────────────────────────────────────\n');
}

function reportSecurity(top: number, json: boolean): void {
  const data = runFallowCommand('security');
  const rawFindings = (data?.security_findings as Array<{ path?: string; line?: number; cwe?: number; kind?: string; evidence?: string }>) || [];

  const findings = rawFindings.filter(f => {
    const norm = (f.path || '').replace(/\\/g, '/');
    return norm.startsWith('src/');
  });

  if (json) {
    console.log(JSON.stringify({ totalSecurity: findings.length, findings: findings.slice(0, top) }, null, 2));
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   REPORTE OFICIAL DE SEGURIDAD Y VULNERABILIDADES CWE                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Total de hallazgos de seguridad en producción (src/): ${findings.length}`);

  if (findings.length === 0) {
    console.log('\n  ✅ ¡Excelente! 0 vulnerabilidades de seguridad CWE detectadas en src/.\n');
    return;
  }

  console.log(`\n🔥 TOP ${Math.min(top, findings.length)} HALLAZGOS CWE:`);
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('  #   CWE       UBICACIÓN                 DESCRIPCIÓN');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  findings.slice(0, top).forEach((f, idx) => {
    const rank = String(idx + 1).padStart(3);
    const cweStr = `CWE-${f.cwe || '?'}`.padEnd(8);
    const loc = `${f.path}:${f.line}`.padEnd(25);
    const ev = (f.evidence || f.kind || '').slice(0, 45);
    console.log(` ${rank}  ${cweStr}  ${loc}  ${ev}`);
  });
  console.log('─────────────────────────────────────────────────────────────────────────────\n');
}

function reportDeadCode(top: number, json: boolean): void {
  const data = runFallowCommand('dead-code');
  const unusedFiles = (data?.unused_files as Array<{ path: string }>) || [];
  const unusedExports = (data?.unused_exports as Array<{ path: string; line: number; export_name: string }>) || [];
  const unusedDeps = (data?.unused_dependencies as Array<{ package_name: string }>) || [];
  const circular = (data?.circular_dependencies as Array<{ path?: string; cycle?: string[] }>) || [];

  if (json) {
    console.log(JSON.stringify({
      unusedFilesCount: unusedFiles.length,
      unusedExportsCount: unusedExports.length,
      unusedDepsCount: unusedDeps.length,
      circularDepsCount: circular.length,
      unusedFiles: unusedFiles.slice(0, top),
      unusedExports: unusedExports.slice(0, top),
      unusedDeps,
      circular
    }, null, 2));
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               REPORTE OFICIAL DE CÓDIGO MUERTO Y DEPENDENCIAS (FALLOW)                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');

  console.log(`\n📊 Resumen de Dead Code:`);
  console.log(`  • Dependencias circulares : ${circular.length} ${circular.length === 0 ? '✅' : '❌'}`);
  console.log(`  • Archivos huérfanos      : ${unusedFiles.length} ${unusedFiles.length === 0 ? '✅' : '❌'}`);
  console.log(`  • Dependencias no usadas  : ${unusedDeps.length} ${unusedDeps.length === 0 ? '✅' : '⚠️'}`);
  console.log(`  • Exports no usados       : ${unusedExports.length} ${unusedExports.length === 0 ? '✅' : '⚠️'}`);

  if (circular.length > 0) {
    console.log('\n🔄 Dependencias Circulares Críticas:');
    circular.forEach((c, idx) => {
      const cycleStr = Array.isArray(c.cycle) ? c.cycle.join(' → ') : (c.path || '');
      console.log(`  [${idx + 1}] ${cycleStr}`);
    });
  }

  if (unusedFiles.length > 0) {
    console.log(`\n🗑️ Archivos Huérfanos (${unusedFiles.length}):`);
    unusedFiles.slice(0, top).forEach((f, idx) => console.log(`  [${idx + 1}] ${f.path}`));
  }

  if (unusedDeps.length > 0) {
    console.log(`\n📦 Dependencias de package.json no usadas (${unusedDeps.length}):`);
    unusedDeps.forEach(d => console.log(`  • ${d.package_name}`));
  }

  if (unusedExports.length > 0) {
    console.log(`\n📤 Top Exports No Usados (${Math.min(top, unusedExports.length)} de ${unusedExports.length}):`);
    unusedExports.slice(0, top).forEach((x, idx) => console.log(`  [${idx + 1}] ${x.path}:${x.line} -> export '${x.export_name}'`));
  }
  console.log('\n─────────────────────────────────────────────────────────────────────────────\n');
}

function reportAllSummary(json: boolean): void {
  const auditPath = path.resolve(process.cwd(), 'scratch/audits/latest_audit.json');
  let auditData: { families?: { architecture?: { suites?: Array<{ id: string; findings: Array<{ message: string }> }> } } } = {};
  if (fs.existsSync(auditPath)) {
    try {
      auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    } catch {
      // Ignore
    }
  }

  const projectSuite = auditData.families?.architecture?.suites?.find(s => s.id === 'audit_project');
  const totalFindings = projectSuite?.findings?.length || 0;
  const complexityCount = projectSuite?.findings?.filter(f => f.message.includes('Sugerencia de complejidad (Fallow)')).length || 0;

  if (json) {
    console.log(JSON.stringify({ totalAuditWarnings: totalFindings, complexityWarnings: complexityCount }, null, 2));
    return;
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   DASHBOARD OFICIAL DE INTELIGENCIA DE CÓDIGO (FALLOW)                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Estado General del Proyecto:`);
  console.log(`  • Total de advertencias de calidad : ${totalFindings}`);
  console.log(`  • Funciones con alta complejidad   : ${complexityCount}`);
  console.log('\n🛠️ COMANDOS DISPONIBLES EN NPM:');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('  • npm run audit:complexity         → Reporte completo de complejidad ciclomática/cognitiva');
  console.log('  • npm run audit:fallow:dupes       → Detección de bloques de código duplicados/triplicados');
  console.log('  • npm run audit:fallow:security    → Auditoría de vulnerabilidades y seguridad CWE');
  console.log('  • npm run audit:fallow:dead-code   → Detección de archivos huérfanos y exports sin uso');
  console.log('  • npm run audit                    → Suite de auditoría unificada del proyecto (20 suites)');
  console.log('─────────────────────────────────────────────────────────────────────────────\n');
}

function executeComplexityReport(jsonOutput: boolean): void {
  const compScript = path.resolve(process.cwd(), 'scripts/auditors/architecture/report_complexity.ts');
  execSync(`node --permission --experimental-strip-types --allow-fs-read=* "${compScript}" ${jsonOutput ? 'json' : ''}`, { stdio: 'inherit' });
}

function main(): void {
  const { category, top, jsonOutput } = parseCommandLineArgs();

  switch (category) {
    case 'dupes':
    case 'duplicates':
      reportDupes(top, jsonOutput);
      break;
    case 'security':
    case 'cwe':
      reportSecurity(top, jsonOutput);
      break;
    case 'dead-code':
    case 'deadcode':
    case 'unused':
      reportDeadCode(top, jsonOutput);
      break;
    case 'complexity':
      executeComplexityReport(jsonOutput);
      break;
    case 'all':
    default:
      reportAllSummary(jsonOutput);
      break;
  }
}

main();
