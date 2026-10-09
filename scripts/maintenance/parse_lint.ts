import fs from 'node:fs';
import path from 'node:path';

const MAX_REPORT_ERRORS_PER_FILE_LIMIT = 10;

interface LintErrorEntry {
  rule: string;
  message: string;
  line: string;
  col: string;
}

interface ParsedLintData {
  fileErrors: Record<string, LintErrorEntry[]>;
  ruleCounts: Record<string, number>;
  totalErrors: number;
}

function isTargetFile(file: string): boolean {
  return file.startsWith('src\\') || file.startsWith('src/') ||
         file.startsWith('supabase\\') || file.startsWith('supabase/') ||
         file.startsWith('test_aventura\\') || file.startsWith('test_aventura/') ||
         file.startsWith('scripts\\') || file.startsWith('scripts/');
}

function parseLintReport(content: string): ParsedLintData {
  const regex = /error:\s+(.*?)\s+\((@typescript-eslint\/.*?|.*?)\)\s+at\s+(.*?):(\d+):(\d+):/g;
  const fileErrors: Record<string, LintErrorEntry[]> = {};
  const ruleCounts: Record<string, number> = {};
  let totalErrors = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const [, message, rule, file, line, col] = match;
    if (!message || !rule || !file || !line || !col) continue;
    if (!isTargetFile(file)) continue;

    totalErrors++;
    if (!fileErrors[file]) {
      fileErrors[file] = [];
    }
    fileErrors[file].push({ rule, message, line, col });
    ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
  }

  return { fileErrors, ruleCounts, totalErrors };
}

function formatMarkdownReport(data: ParsedLintData): string {
  let md = `# Reporte Consolidado de Errores de Linter\n\n`;
  md += `* **Total de Errores Encontrados en Directorios Clave:** ${data.totalErrors}\n\n`;
  md += `## Resumen por Regla Violada\n\n`;
  md += `| Regla | Cantidad |\n`;
  md += `| :--- | :--- |\n`;

  const sortedRules = Object.entries(data.ruleCounts).sort((a, b) => b[1] - a[1]);
  for (const [rule, count] of sortedRules) {
    md += `| \`${rule}\` | ${count} |\n`;
  }
  md += `\n## Desglose por Archivo\n\n`;

  const sortedFiles = Object.entries(data.fileErrors).sort((a, b) => b[1].length - a[1].length);
  for (const [file, errors] of sortedFiles) {
    md += `### 📄 [${file}](${file.split('\\').join('/')}) (${errors.length} errores)\n`;
    md += `| Línea | Regla | Mensaje |\n`;
    md += `| :--- | :--- | :--- |\n`;
    const visibleErrors = errors.slice(0, MAX_REPORT_ERRORS_PER_FILE_LIMIT);
    for (const err of visibleErrors) {
      md += `| ${err.line}:${err.col} | \`${err.rule}\` | ${err.message.replace(/\|/g, '\\|')} |\n`;
    }
    if (errors.length > MAX_REPORT_ERRORS_PER_FILE_LIMIT) {
      md += `| ... | ... | *(y ${errors.length - MAX_REPORT_ERRORS_PER_FILE_LIMIT} errores más)* |\n`;
    }
    md += `\n`;
  }
  return md;
}

function run(): void {
  const reportPath = path.join(process.cwd(), 'scratch/lint_report.txt');
  if (!fs.existsSync(reportPath)) {
    console.error('No lint report found at scratch/lint_report.txt');
    return;
  }

  const content = fs.readFileSync(reportPath, 'utf8');
  const data = parseLintReport(content);
  const md = formatMarkdownReport(data);

  const outputPath = path.join(process.cwd(), 'scratch/eslint_summary.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`Summary report written to ${outputPath}`);
}

run();
