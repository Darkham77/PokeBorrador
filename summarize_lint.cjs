
const fs = require('fs');
let raw = fs.readFileSync('lint_final_report_utf8.json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const jsonStart = raw.indexOf('[');
const data = JSON.parse(raw.substring(jsonStart));

const summary = data
  .filter(f => !f.filePath.includes('backup_legacy_code') && !f.filePath.includes('_js_backup'))
  .map(f => ({
    file: f.filePath.replace(/\\/g, '/').split('Pokemon-Online/')[1] || f.filePath,
    errors: f.errorCount,
    warnings: f.warningCount,
    total: f.errorCount + f.warningCount
  }))
  .filter(f => f.total > 0)
  .sort((a, b) => b.total - a.total);

console.table(summary.slice(0, 20));
