import fs from 'node:fs';
import path from 'node:path';

// Load translation names
const abilitiesJson = JSON.parse(fs.readFileSync('src/data/battle/abilities.json', 'utf-8'));
const movesJson = JSON.parse(fs.readFileSync('src/data/battle/moves.json', 'utf-8'));
const itemsJson = JSON.parse(fs.readFileSync('src/data/inventory/items.json', 'utf-8'));

const spanishNames = new Set<string>();

// Helper to add clean name
const addName = (name?: string) => {
  if (name && name.trim()) {
    spanishNames.add(name.trim());
  }
};

Object.values(abilitiesJson).forEach((a: any) => addName(a.name));
Object.values(movesJson).forEach((m: any) => addName(m.name));
if (itemsJson.SHOP_ITEMS) {
  itemsJson.SHOP_ITEMS.forEach((i: any) => addName(i.name));
}

// Add natures manually since it's a small TS file
const natureNames = [
  'Firme', 'Tímido', 'Osado', 'Audaz', 'Sereno', 'Cauto', 'Dócil', 'Amable', 
  'Fuerte', 'Activa', 'Agitada', 'Alegre', 'Floja', 'Huraña', 'Afable', 
  'Modesta', 'Ingenua', 'Pícara', 'Mansa', 'Rara', 'Alocada', 'Plácida', 
  'Grosera', 'Seria', 'Miedosa'
];
natureNames.forEach(addName);

console.log(`Cargados ${spanishNames.size} nombres en español para buscar.`);

// Recursively find files in src/
const scanDir = (dir: string, fileList: string[] = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'data' && file !== 'node_modules' && file !== '.git') {
        scanDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.vue')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

const filesToScan = [
  ...scanDir('src'),
  ...scanDir('scripts'),
  ...scanDir('tests')
];
console.log(`Escaneando ${filesToScan.length} archivos...`);

interface Match {
  file: string;
  line: number;
  word: string;
  content: string;
}

const matches: Match[] = [];

for (const file of filesToScan) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((lineText, index) => {
    // Basic regex to find strings in quotes matching the Spanish names
    spanishNames.forEach(word => {
      const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(['"\`])${escaped}\\1`, 'g');
      if (regex.test(lineText)) {
        matches.push({
          file: file.replace(/\\/g, '/'),
          line: index + 1,
          word,
          content: lineText.trim()
        });
      }
    });
  });
}

// Generate report in workspace root scratch/
const reportPath = 'scratch/spanish_id_report.md';
let markdown = `# Reporte de Coincidencias de IDs Lógicos en Español\n\n`;
markdown += `Se encontraron **${matches.length}** posibles coincidencias de cadenas en español que podrían corresponder a comparaciones lógicas.\n\n`;
markdown += `| Archivo | Línea | Palabra en Español | Coincidencia de Código |\n`;
markdown += `| :--- | :--- | :--- | :--- |\n`;

matches.forEach(m => {
  markdown += `| [${path.basename(m.file)}](file:///${path.resolve(m.file)}) | ${m.line} | \`${m.word}\` | \`${m.content.replace(/`/g, '\\`').slice(0, 100)}\` |\n`;
});

fs.writeFileSync(reportPath, markdown, 'utf-8');
console.log(`Reporte generado con éxito en ${reportPath}.`);
