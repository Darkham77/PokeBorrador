const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('lint_full_report.txt', 'utf16le');
const lines = content.split('\n');

const results = {};
let currentFile = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  // File path line starts with C:\ or similar and doesn't contain error/warning on same line
  if (trimmed.includes('C:\\') && !trimmed.includes('error') && !trimmed.includes('warning')) {
    currentFile = trimmed;
    if (!results[currentFile]) results[currentFile] = { errors: 0, warnings: 0 };
    continue;
  }

  if (currentFile) {
    if (trimmed.includes('error')) {
      results[currentFile].errors++;
    } else if (trimmed.includes('warning')) {
      results[currentFile].warnings++;
    }
  }
}

const sorted = Object.entries(results)
  .map(([file, counts]) => ({
    file: path.relative(process.cwd(), file),
    ...counts,
    total: counts.errors + counts.warnings
  }))
  .sort((a, b) => b.total - a.total);

let output = '# Reporte de Impacto de Linting (Peor a Mejor)\n\n';
output += '| Módulo / Archivo | Errores | Warnings | Total |\n';
output += '| :--- | :---: | :---: | :---: |\n';
sorted.forEach(item => {
  output += `| \`${item.file}\` | ${item.errors} | ${item.warnings} | **${item.total}** |\n`;
});

fs.writeFileSync('lint_results.md', output, 'utf8');
console.log('Reporte generado en lint_results.md');
