/**
 * scripts/validation/validate_abilities.ts
 * 
 * ABILITY INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of POKEMON_ABILITIES and ABILITY_DATA against the local Showdown DB.
 * 
 * Usage: npm run validate:abilities
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { setupValidation } from '../lib/validationBase.ts';

// Importar base de datos del juego
import { POKEMON_ABILITIES, ABILITY_DATA } from '../../src/data/battle/abilities.ts';

const DATA_FILE = path.resolve(process.cwd(), 'src/data/battle/abilities.ts');
const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const validator = setupValidation({
    title: 'POKEMON ABILITY VALIDATOR',
    requiredFiles: [DATA_FILE, SHOWDOWN_DB_PATH]
  });

  await validator.checkFiles();

  // 1. Cargar base de datos local de Showdown
  let showdownDB: any;
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  // Mapear habilidades en español del Showdown para búsquedas rápidas
  const sdAbilitiesSet = new Set<string>();
  for (const sdAbi of Object.values(showdownDB.abilities) as any[]) {
    sdAbilitiesSet.add(normalizeName(sdAbi.name));
  }

  // 2. Extraer habilidades del juego
  const gameAbilities = new Set<string>();
  for (const abList of Object.values(POKEMON_ABILITIES)) {
    abList.forEach(ab => gameAbilities.add(ab));
  }

  console.log(`📦 Habilidades únicas asignadas a Pokémon: ${gameAbilities.size}`);
  console.log(`📝 Habilidades definidas en ABILITY_DATA: ${Object.keys(ABILITY_DATA).length}\n`);

  const errors: string[] = [];
  const warnings: string[] = [];

  // 3. Validar asignaciones contra la base de datos de Showdown y descripciones
  for (const abName of Array.from(gameAbilities)) {
    const tag = `[${abName}]`;

    // Validar si tiene descripción en el juego
    if (!(ABILITY_DATA as Record<string, any>)[abName]) {
      errors.push(`${tag} Falta descripción en ABILITY_DATA.`);
    }

    // Validar si existe en la base de datos local de Showdown ( Gen 3 )
    const normName = normalizeName(abName);
    if (!sdAbilitiesSet.has(normName)) {
      warnings.push(`${tag} No coincide con ninguna habilidad oficial en Showdown (Gen 3).`);
    }
  }

  // 4. Validar descripciones huérfanas (definidas pero no usadas)
  Object.keys(ABILITY_DATA).forEach(name => {
    if (!gameAbilities.has(name)) {
      warnings.push(`[${name}] Definida en ABILITY_DATA pero no está asignada a ningún Pokémon.`);
    }
  });

  await validator.finish(
    {
      'Habilidades únicas detectadas': gameAbilities.size,
      'Habilidades en ABILITY_DATA': Object.keys(ABILITY_DATA).length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
