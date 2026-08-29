// fallow-ignore-file security-sink
/**
 * scripts/auditors/domain_data/validate_spanish_ids.ts
 * 
 * SPANISH LOGIC STRINGS & LEAKS AUDITOR (Node.js 26+ Native)
 * Scans code files for potential hardcoded Spanish names used as logic IDs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

// Load translation names
const abilitiesJson = JSON.parse(fs.readFileSync('src/data/battle/abilities.json', 'utf-8')) as Record<string, { name?: string }>; // open-record
const movesJson = JSON.parse(fs.readFileSync('src/data/battle/moves.json', 'utf-8')) as Record<string, { name?: string }>; // open-record
const itemsJson = JSON.parse(fs.readFileSync('src/data/inventory/items.json', 'utf-8')) as { SHOP_ITEMS?: Array<{ name?: string }> };

const spanishNames = new Set<string>();

const addName = (name?: string) => {
  if (name && name.trim()) {
    spanishNames.add(name.trim().toLowerCase());
  }
};

Object.values(abilitiesJson).forEach((a) => addName(a.name));
Object.values(movesJson).forEach((m) => addName(m.name));
if (itemsJson.SHOP_ITEMS) {
  itemsJson.SHOP_ITEMS.forEach((i) => addName(i.name));
}

const natureNames = [ // no-domain
  'Firme', 'Tímido', 'Osado', 'Audaz', 'Sereno', 'Cauto', 'Dócil', 'Amable', 
  'Fuerte', 'Activa', 'Agitada', 'Alegre', 'Floja', 'Huraña', 'Afable', 
  'Modesta', 'Ingenua', 'Pícara', 'Mansa', 'Rara', 'Alocada', 'Plácida', 
  'Grosera', 'Seria', 'Miedosa'
];
natureNames.forEach(addName);

// Recursively find files in src/
const scanDir = (dir: string, fileList: string[] = []) => {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'data' && file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.vue')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

async function main() {
  const validator = setupValidation({
    title: 'SPANISH LOGIC STRINGS & LEAKS AUDITOR'
  });

  await validator.checkFiles();

  const filesToScan = [
    ...scanDir('src/logic'),
    ...scanDir('src/stores')
  ];

  const QUOTED_REGEX = /['"`]([^'"`]+)['"`]/g;
  let matchesCount = 0;
  const warnings: string[] = [];

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let index = 0; index < lines.length; index++) {
      const lineText = lines[index]!;
      let match: RegExpExecArray | null;
      while ((match = QUOTED_REGEX.exec(lineText)) !== null) {
        const word = match[1]?.trim().toLowerCase();
        if (word && spanishNames.has(word) && !lineText.includes('// spanish-ok')) {
          matchesCount++;
          validator.addWarning(
            `Posible coincidencia de ID lógico en español: '${match[1]}'`,
            file.replace(/\\/g, '/'),
            index + 1,
            lineText.trim(),
            'spanish-logic-id'
          );
        }
      }
    }
  }

  await validator.finish(
    {
      'Nombres en español auditados': spanishNames.size,
      'Archivos escaneados': filesToScan.length,
      'Coincidencias potenciales': matchesCount
    },
    [],
    warnings
  );
}

main().catch(err => {
  console.error(`💥 Error fatal: ${(err as Error).message}`);
  process.exit(1);
});
