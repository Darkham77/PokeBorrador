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
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';

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

async function canLearnMove(speciesId: string, moveId: string, gen: number): Promise<boolean> {
  let currentId: string | undefined = speciesId;
  while (currentId) {
    const sdLearnset = await Dex.forGen(gen).learnsets.get(currentId);
    const sources = sdLearnset?.learnset?.[moveId];
    if (sources && sources.some(src => src.startsWith(String(gen)))) {
      return true;
    }
    const speciesInfo = Dex.forGen(gen).species.get(currentId);
    currentId = speciesInfo.prevo ? toID(speciesInfo.prevo) : undefined;
  }
  return false;
}

async function main() {
  const validator = setupValidation({
    title: 'POKEMON INTEGRITY VALIDATOR',
    requiredFiles: [DB_FILE, SHOWDOWN_DB_PATH]
  });

  await validator.checkFiles();

  // 1. Cargar base de datos local de Showdown
  interface ShowdownPokeEntry {
    baseStats: Record<string, number>;
    abilities: string[];
    types: string[];
  }
  let showdownDB: { pokemon: Record<string, ShowdownPokeEntry>; abilities?: Record<string, { name?: string }> };
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  // Mapeos normalizados de Showdown para búsquedas rápidas
  const sdPokemonMap = new Map<string, ShowdownPokeEntry>();
  for (const [key, val] of Object.entries(showdownDB.pokemon)) {
    sdPokemonMap.set(normalizeId(key), val);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const statsKeys: Array<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

  // 2. Validar cada Pokémon
  for (const [coreId, corePoke] of Object.entries(POKEMON_DB)) {
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
    const type2 = (corePoke as unknown as { type2?: string }).type2;
    if (type2) coreTypes.push(type2);

    const sdTypesEng = sdPoke.types.map((t: string) => REVERSE_TYPE_MAP[t] || t.toLowerCase());

    const coreTypesStr = coreTypes.slice().sort().join(',');
    const sdTypesStr = sdTypesEng.slice().sort().join(',');

    if (coreTypesStr !== sdTypesStr) {
      errors.push(`${tag} Discrepancia en tipos: Juego [${coreTypesStr}] vs Showdown [${sdTypesStr}].`);
    }

    // C. Validar habilidad única asignada (obtenida de Dex)
    const speciesInfo = Dex.forGen(ACTIVE_GENERATION).species.get(coreId);
    const sdAbilities = sdPoke.abilities || [];
    const coreAbilities = speciesInfo.exists ? Object.values(speciesInfo.abilities) : [];

    if (coreAbilities.length === 0) {
      errors.push(`${tag} No tiene ninguna habilidad asignada en el Dex de pkms.`);
    } else {
      const officialAbility = sdAbilities[0];
      const coreActive = coreAbilities[0];
      if (officialAbility && coreActive) {
        const cleanActiveId = toID(coreActive);
        const translated = (showdownDB.abilities as Record<string, { name?: string }>)[cleanActiveId] || {};
        const espName = translated.name || coreActive;
        if (toID(espName) !== toID(officialAbility)) {
          errors.push(`${tag} Discrepancia en habilidad activa: Juego '${coreActive}' ('${espName}') vs Showdown oficial '${officialAbility}'.`);
        }
      }
    }

    // D. Validar movimientos del learnset
    if (corePoke.learnset && Array.isArray(corePoke.learnset)) {
      for (const moveEntry of corePoke.learnset) {
        if (moveEntry.id === 'Unknown') continue;

        const moveId = toID(moveEntry.id);
        const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);

        if (!moveData.exists) {
          errors.push(`${tag} El movimiento '${moveEntry.id}' no existe en el Dex de Gen ${ACTIVE_GENERATION}.`);
          continue;
        }

        const isLearnable = await canLearnMove(normalizeId(coreId), moveId, ACTIVE_GENERATION);
        if (!isLearnable) {
          errors.push(`${tag} El movimiento '${moveEntry.id}' (${moveId}) no es aprendible/elegible en la Generación ${ACTIVE_GENERATION}.`);
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
