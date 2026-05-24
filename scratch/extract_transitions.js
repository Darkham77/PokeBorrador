import fs from 'node:fs';

const report = fs.readFileSync('scratch/audit_report.txt', 'utf-8');
const lines = report.split('\n');
const results = [];

for (const line of lines) {
  if (line.includes('Animación manual detectada') && !line.includes('showdown\\')) {
    results.push(line.trim());
  }
}

fs.writeFileSync('scratch/transitions_list.txt', results.join('\n'), 'utf-8');
console.log(`Found ${results.length} transition violations outside showdown.`);
