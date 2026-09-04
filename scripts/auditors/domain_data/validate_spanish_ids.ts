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
const abilitiesJson = JSON.parse(fs.readFileSync('src/data/battle/abilities.json', 'utf-8')) as Record<string, { name?: string }>; // open-record: Generic key-value data dictionary container
const movesJson = JSON.parse(fs.readFileSync('src/data/battle/moves.json', 'utf-8')) as Record<string, { name?: string }>; // open-record: Generic key-value data dictionary container
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

const natureNames = [ // no-domain: Non-domain utility collection or data structure
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
    ...scanDir('src/stores'),
    ...scanDir('src/composables'),
    ...scanDir('src/components'),
    ...scanDir('src/views'),
    ...scanDir('database')
  ];

  validator.logStep(1, 1, `Escaneando ${spanishNames.size} nombres/identificadores en español en ${filesToScan.length} archivos...`);

  const CRITICAL_LOGIC_PATTERNS = [
    // Nature assignments: nature: 'Serio' / 'Firme'
    /\bnature\s*:\s*['"]([A-Za-zñÑáéíóúÁÉÍÓÚ]+)['"]/g,
    // Direct domain helper calls with Spanish literal: getMoveData('Mordisco')
    /\b(?:getMoveData|getItemById|toNatureId|requirePokemonSpeciesId|requirePokemonMoveId|requireItemId)\s*\(\s*['"]([^'"`]+)['"]\s*\)/g,
    // Inventory lookups by Spanish name or legacy keys: inventory['Poción'] or inventory['move_relearner']
    /\binventory\s*\[\s*['"]([^'"`]+)['"]\s*\]/g,
    // Logic comparisons: === 'Serio' or == 'Poción'
    /[!=]==?\s*['"]([A-Za-zñÑáéíóúÁÉÍÓÚ\s]+)['"]/g
  ];

  let matchesCount = 0;
  const warnings: string[] = [];

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let index = 0; index < lines.length; index++) {
      const lineText = lines[index]!;
      if (lineText.includes('// spanish-ok: UI Spanish text localization label') || lineText.includes('// text-ok: UI text display localization string')) continue;

      // Check critical logic patterns
      for (const pattern of CRITICAL_LOGIC_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(lineText)) !== null) {
          const word = match[1]?.trim().toLowerCase();
          if (word && (spanishNames.has(word) || word === 'move_relearner')) {
            // Exceptions for valid Spanish test assertions, translations definitions or UI confirm texts
            if (lineText.includes('toThrow') || lineText.includes('expect(') || lineText.includes('name:') || lineText.includes('MOVE_TRANSLATIONS_ES') || lineText.includes('ABILITY_TRANSLATIONS_ES')) {
              continue;
            }
            matchesCount++;
            validator.addWarning(
              `Uso de nombre en español en contexto de lógica: '${match[1]}'`,
              file.replace(/\\/g, '/'),
              index + 1,
              lineText.trim(),
              'spanish-logic-id'
            );
          }
        }
      }
    }
  }

  await validator.finish(
    {
      'Nombres en español auditados': spanishNames.size,
      'Archivos escaneados': filesToScan.length,
      'Coincidencias en lógica': matchesCount
    },
    [],
    warnings
  );
}

main().catch(err => {
  console.error(`💥 Error fatal: ${(err as Error).message}`);
  process.exit(1);
});
