import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { renderBanner, renderBoxTable, type TableColumn } from '../../lib/unifiedTheme.ts';

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
  const rawCliArgs = process.argv.slice(2);
  const normalizedCliArgs = rawCliArgs.map(cliParam => {
    if (cliParam.includes('=') && !cliParam.startsWith('-')) return `--${cliParam}`;
    return cliParam;
  });

  const { values } = parseArgs({
    args: normalizedCliArgs,
    options: {
      top: { type: 'string', default: '20' },
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

    const relPath = path.relative(process.cwd(), f.file).replace(/\\/g, '/');
    const segments = relPath.startsWith('src/') ? relPath.split('/') : relPath.replace(/^ui-demo\//, '').split('/');
    const layer = (segments.length > 1 && segments[1]) ? segments[1] : 'root';

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

  console.log('\n' + renderBanner('COMPLEJIDAD CICLOMÁTICA Y COGNITIVA (FALLOW)', `Funciones analizadas en src/: ${findings.length}`));

  const distribution: Record<string, number> = {};
  for (const f of findings) {
    distribution[f.layer] = (distribution[f.layer] || 0) + 1;
  }

  console.log('\n📁 DISTRIBUCIÓN POR CAPA (src/*):\n');

  interface LayerDistRow {
    layer: string;
    count: string;
    percentage: string;
  }

  const layerCols: readonly TableColumn<LayerDistRow>[] = [
    { header: 'CAPA DE ARQUITECTURA', width: 45, align: 'left', key: 'layer' },
    { header: 'FUNCIONES', width: 11, align: 'right', key: 'count' },
    { header: '% TOTAL', width: 10, align: 'right', key: 'percentage' }
  ];

  const layerRows: LayerDistRow[] = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .map(([layer, count]) => {
      const pct = ((count / findings.length) * 100).toFixed(1) + '%';
      return {
        layer: `src/${layer}`,
        count: String(count),
        percentage: pct
      };
    });

  console.log(renderBoxTable(layerCols, layerRows));

  console.log(`\n🔥 TOP ${Math.min(topLimit, filtered.length)} HOTSPOTS DE COMPLEJIDAD ${layerFilter ? `(Filtro: src/${layerFilter})` : ''}:\n`);

  interface HotspotRow {
    index: string;
    cog: string;
    cyc: string;
    total: string;
    fileLoc: string;
  }

  const hotspotCols: readonly TableColumn<HotspotRow>[] = [
    { header: '#', width: 3, align: 'center', key: 'index' },
    { header: 'COGNITIVA', width: 9, align: 'right', key: 'cog' },
    { header: 'CICLOMÁTICA', width: 11, align: 'right', key: 'cyc' },
    { header: 'TOTAL', width: 6, align: 'right', key: 'total' },
    { header: 'ARCHIVO:LÍNEA', width: 32, align: 'left', key: 'fileLoc' }
  ];

  const hotspotRows: HotspotRow[] = filtered.slice(0, topLimit).map((f, idx) => ({
    index: String(idx + 1),
    cog: styleText('yellow', String(f.cog)),
    cyc: styleText('yellow', String(f.cyc)),
    total: styleText(f.total > 25 ? 'red' : 'yellow', String(f.total)),
    fileLoc: `${f.file}:${f.line}`
  }));

  console.log(renderBoxTable(hotspotCols, hotspotRows));
  console.log('');
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
