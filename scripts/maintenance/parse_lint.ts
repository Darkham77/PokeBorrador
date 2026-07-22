// fallow-ignore-file security-sink
import fs from 'node:fs';
import path from 'node:path';

function run(): void {
  const reportPath = path.join(process.cwd(), 'scratch/lint_report.txt');
  if (!fs.existsSync(reportPath)) {
    console.error('No lint report found at scratch/lint_report.txt');
    return;
  }

  const content = fs.readFileSync(reportPath, 'utf8');
  // Match lines containing: "error: [message] ([rule]) at [file]:[line]:[col]:"
  const regex = /error:\s+(.*?)\s+\((@typescript-eslint\/.*?|.*?)\)\s+at\s+(.*?):(\d+):(\d+):/g;
  
  const fileErrors: Record<string, Array<{ rule: string; message: string; line: string; col: string }>> = {};
  const ruleCounts: Record<string, number> = {};
  let totalErrors = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const [_, message, rule, file, line, col] = match;
    if (!message || !rule || !file || !line || !col) continue;

    // Filter only target directories: src, supabase, test aventura, scripts
    const isTarget = file.startsWith('src\\') || file.startsWith('src/') ||
                     file.startsWith('supabase\\') || file.startsWith('supabase/') ||
                     file.startsWith('test aventura\\') || file.startsWith('test aventura/') ||
                     file.startsWith('scripts\\') || file.startsWith('scripts/');
    if (!isTarget) continue;

    totalErrors++;
    
    if (!fileErrors[file]) {
      fileErrors[file] = [];
    }
    fileErrors[file].push({ rule, message, line, col });

    ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
  }

  // Create markdown summary report
  let md = `# Reporte Consolidado de Errores de Linter\n\n`;
  md += `* **Total de Errores Encontrados en Directorios Clave:** ${totalErrors}\n\n`;
  
  md += `## Resumen por Regla Violada\n\n`;
  md += `| Regla | Cantidad |\n`;
  md += `| :--- | :--- |\n`;
  const sortedRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);
  for (const [rule, count] of sortedRules) {
    md += `| \`${rule}\` | ${count} |\n`;
  }
  md += `\n`;

  md += `## Desglose por Archivo\n\n`;
  const sortedFiles = Object.entries(fileErrors).sort((a, b) => b[1].length - a[1].length);
  for (const [file, errors] of sortedFiles) {
    md += `### 📄 [${file}](${file.split('\\').join('/')}) (${errors.length} errores)\n`;
    md += `| Línea | Regla | Mensaje |\n`;
    md += `| :--- | :--- | :--- |\n`;
    // Show top 10 errors per file to keep report clean
    const visibleErrors = errors.slice(0, 10);
    for (const err of visibleErrors) {
      md += `| ${err.line}:${err.col} | \`${err.rule}\` | ${err.message.replace(/\|/g, '\\|')} |\n`;
    }
    if (errors.length > 10) {
      md += `| ... | ... | *(y ${errors.length - 10} errores más)* |\n`;
    }
    md += `\n`;
  }

  const outputPath = path.join(process.cwd(), 'scratch/eslint_summary.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`Summary report written to ${outputPath}`);
}

run();
