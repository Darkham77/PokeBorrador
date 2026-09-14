import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

interface ComplexityFinding {
  file: string;
  line: number;
  message: string;
  cog: number;
  cyc: number;
  total: number;
  layer: string;
}

const DEFAULT_TOP_LIMIT = 20;
const RADIX_DECIMAL = 10;

function parseCommandLineArgs() {
  const { values } = parseArgs({
    options: {
      top: { type: 'string', default: '20' }, // no-magic: Explicit mathematical constant or threshold value
      layer: { type: 'string' },
      json: { type: 'boolean', default: false }
    },
    strict: false,
    allowPositionals: true
  });

  return {
    top: parseInt(values.top as string, RADIX_DECIMAL) || DEFAULT_TOP_LIMIT,
    layerFilter: values.layer as string | undefined,
    jsonOutput: Boolean(values.json)
  };
}

function loadComplexityFindings(): ComplexityFinding[] {
  const auditPath = path.resolve(process.cwd(), 'scratch/audits/latest_audit.json');
  if (!fs.existsSync(auditPath)) {
    console.error(`[ComplexityReport] No se encontró el archivo de auditoría: ${auditPath}. Ejecuta 'npm run audit' primero.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(auditPath, 'utf8');
  const data = JSON.parse(raw);
  const suite = data.families?.architecture?.suites?.find((s: { id: string }) => s.id === 'audit_project');

  if (!suite || !Array.isArray(suite.findings)) {
    console.error('[ComplexityReport] No se encontraron hallazgos en la suite audit_project.');
    return [];
  }

  const findings: ComplexityFinding[] = [];

  for (const f of suite.findings) {
    if (typeof f.message !== 'string' || !f.message.includes('Sugerencia de complejidad (Fallow)')) {
      continue;
    }

    const m = f.message.match(/cognitiva:\s*(\d+),\s*ciclomática:\s*(\d+)/i);
    const cog = m ? parseInt(m[1], 10) : 0;
    const cyc = m ? parseInt(m[2], 10) : 0;

    const normalizedPath = f.file.replace(/\\/g, '/');
    const srcIndex = normalizedPath.indexOf('/src/');
    const relPath = srcIndex !== -1 ? normalizedPath.slice(srcIndex + 1) : normalizedPath;
    const segments = relPath.split('/');
    const layer = segments.length > 1 ? segments[1] : 'root';

    findings.push({
      file: relPath,
      line: f.line || 1,
      message: f.message,
      cog,
      cyc,
      total: cog + cyc,
      layer
    });
  }

  findings.sort((a, b) => b.total - a.total);
  return findings;
}

function renderBoxReport(findings: ComplexityFinding[], topLimit: number, layerFilter?: string): void {
  const filtered = layerFilter
    ? findings.filter(f => f.layer.toLowerCase() === layerFilter.toLowerCase())
    : findings;

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               REPORTE OFICIAL DE COMPLEJIDAD CICLOMÁTICA Y COGNITIVA (FALLOW)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Total de funciones complejas en src/: ${findings.length}`);

  const distribution: Record<string, number> = {};
  for (const f of findings) {
    distribution[f.layer] = (distribution[f.layer] || 0) + 1;
  }

  console.log('\n📁 DISTRIBUCIÓN POR CAPA (src/*):');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  for (const [layer, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / findings.length) * 100).toFixed(1);
    console.log(`  • src/${layer.padEnd(15)} : ${String(count).padStart(4)} funciones (${pct}%)`);
  }

  console.log(`\n🔥 TOP ${Math.min(topLimit, filtered.length)} HOTSPOTS CON MAYOR COMPLEJIDAD ${layerFilter ? `(Filtro: src/${layerFilter})` : ''}:`);
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('  #   COGNITIVA   CICLOMÁTICA   TOTAL   ARCHIVO:LÍNEA');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  filtered.slice(0, topLimit).forEach((f, idx) => {
    const rank = String(idx + 1).padStart(3);
    const cogStr = String(f.cog).padStart(9);
    const cycStr = String(f.cyc).padStart(11);
    const totalStr = String(f.total).padStart(6);
    console.log(` ${rank}  ${cogStr}   ${cycStr}   ${totalStr}   ${f.file}:${f.line}`);
  });
  console.log('─────────────────────────────────────────────────────────────────────────────\n');
}

function main(): void {
  const { top, layerFilter, jsonOutput } = parseCommandLineArgs();
  const findings = loadComplexityFindings();

  if (jsonOutput) {
    console.log(JSON.stringify({ total: findings.length, findings: findings.slice(0, top) }, null, 2));
    return;
  }

  renderBoxReport(findings, top, layerFilter);
}

main();
