/**
 * scripts/validation/validate_pokemon.ts
 * 
 * POKEMON INTEGRITY VALIDATOR (Node.js 26+ Native)
 * Validates integrity of POKEMON_DB stats, types, abilities, and learnsets against Showdown DB.
 * 
 * Usage: npm run validate:pokemon
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { setupValidation } from '../lib/validationBase.ts';

// Importar bases de datos locales
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';
import { POKEMON_ABILITIES } from '../../src/data/battle/abilities.ts';
import { MOVE_DATA } from '../../src/data/battle/moves.ts';

const DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');

const REVERSE_TYPE_MAP: Record<string, string> = {
  'Planta': 'grass',
  'Veneno': 'poison',
  'Fuego': 'fire',
  'Volador': 'flying',
  'Agua': 'water',
  'Bicho': 'bug',
  'Normal': 'normal',
  'Eléctrico': 'electric',
  'Tierra': 'ground',
  'Hada': 'fairy',
  'Siniestro': 'dark',
  'Lucha': 'fighting',
  'Acero': 'steel',
  'Hielo': 'ice',
  'Fantasma': 'ghost',
  'Roca': 'rock',
  'Psíquico': 'psychic',
  'Dragón': 'dragon'
};

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const validator = setupValidation({
    title: 'POKEMON INTEGRITY VALIDATOR',
    requiredFiles: [DB_FILE, SHOWDOWN_DB_PATH]
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

  // Mapeos normalizados de Showdown para búsquedas rápidas
  const sdPokemonMap = new Map<string, any>();
  for (const [key, val] of Object.entries(showdownDB.pokemon)) {
    sdPokemonMap.set(normalizeId(key), val);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const statsKeys: Array<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

  // 2. Validar cada Pokémon
  for (const [coreId, corePoke] of Object.entries(POKEMON_DB) as [string, any][]) {
    const tag = `[${corePoke.name} (${coreId})]`;
    const sdPoke = sdPokemonMap.get(normalizeId(coreId));

    if (!sdPoke) {
      errors.push(`${tag} No existe en la base de datos de Showdown.`);
      continue;
    }

    // A. Validar estadísticas base
    for (const stat of statsKeys) {
      const coreVal = corePoke[stat];
      const sdVal = sdPoke.baseStats[stat];
      if (coreVal !== sdVal) {
        errors.push(`${tag} Discrepancia en stat '${stat.toUpperCase()}': Juego ${coreVal} vs Showdown ${sdVal}.`);
      }
    }

    // B. Validar tipos
    const coreTypes: string[] = [];
    if (corePoke.type) coreTypes.push(corePoke.type);
    if (corePoke.type2) coreTypes.push(corePoke.type2);

    const sdTypesEng = sdPoke.types.map((t: string) => REVERSE_TYPE_MAP[t] || t.toLowerCase());

    const coreTypesStr = coreTypes.slice().sort().join(',');
    const sdTypesStr = sdTypesEng.slice().sort().join(',');

    if (coreTypesStr !== sdTypesStr) {
      errors.push(`${tag} Discrepancia en tipos: Juego [${coreTypesStr}] vs Showdown [${sdTypesStr}].`);
    }

    // C. Validar habilidad única asignada
    const coreAbilities = (POKEMON_ABILITIES as Record<string, string[]>)[coreId] || [];
    const sdAbilities = sdPoke.abilities || [];

    if (coreAbilities.length === 0) {
      errors.push(`${tag} No tiene ninguna habilidad asignada en POKEMON_ABILITIES.`);
    } else {
      if (coreAbilities.length > 1) {
        errors.push(`${tag} Tiene más de 1 habilidad asignada (${coreAbilities.join(', ')}). Sólo debe haber 1 habilidad activa.`);
      }
      
      const officialAbility = sdAbilities[0];
      if (officialAbility && coreAbilities[0] !== officialAbility) {
        errors.push(`${tag} Discrepancia en habilidad activa: Juego '${coreAbilities[0]}' vs Showdown oficial '${officialAbility}'.`);
      }
    }

    // D. Validar movimientos del learnset
    if (corePoke.learnset && Array.isArray(corePoke.learnset)) {
      for (const moveEntry of corePoke.learnset) {
        if (moveEntry.id !== 'Unknown' && !MOVE_DATA[moveEntry.id]) {
          errors.push(`${tag} El movimiento '${moveEntry.id}' en su learnset no existe en MOVE_DATA.`);
        }
      }
    } else {
      errors.push(`${tag} Falta o es inválida la propiedad 'learnset'.`);
    }
  }

  // 3. Finalizar reporte
  await validator.finish(
    {
      'Pokémon core validados': Object.keys(POKEMON_DB).length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${err.message}`));
  process.exit(1);
});
