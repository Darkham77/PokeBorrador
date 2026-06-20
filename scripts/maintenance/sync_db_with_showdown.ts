import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';

enableCompileCache();

// Importar bases de datos originales del juego
import { POKEMON_DB } from '../../src/data/pokemon/pokemonDB.ts';

const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db_es.json');
const POKEMON_DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');

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
  console.log(styleText('bold', '\n--- 🔄 INICIANDO ACCIÓN DE SINCRONIZACIÓN Y REGENERACIÓN DE LEARNSETS ---'));

  // 1. Cargar base de datos de Showdown
  interface ShowdownPokeData {
    baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
    abilities: string[];
    types?: string[];
  }

  interface MutablePokemon {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    type: string;
    type2?: string;
    learnset?: Array<{ lv: number; id: string; name: string; pp: number }>;
  }

  let showdownDB: { pokemon: Record<string, ShowdownPokeData>; moves: Record<string, { pp?: number; name?: string }> };
  try {
    const rawData = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
    showdownDB = JSON.parse(rawData);
  } catch (error) {
    console.error(styleText('red', `❌ Error cargando base de datos de Showdown: ${(error as Error).message}`));
    process.exit(1);
  }

  // Mapear IDs de movimientos existentes para preservar el formato snake_case
  const existingMoveIds = new Map<string, string>();
  for (const poke of Object.values(POKEMON_DB)) {
    const lset = (poke as unknown as { learnset?: Array<{ id: string }> }).learnset;
    if (lset && Array.isArray(lset)) {
      for (const m of lset) {
        if (m && m.id) {
          existingMoveIds.set(toID(m.id), m.id);
        }
      }
    }
  }

  // Mapeos normalizados de Showdown
  const sdPokemonMap = new Map<string, ShowdownPokeData>();
  for (const [key, val] of Object.entries(showdownDB.pokemon)) {
    sdPokemonMap.set(normalizeId(key), val);
  }

  // 2. Modificar Pokémon DB en memoria
  const updatedPokemonDb = JSON.parse(JSON.stringify(POKEMON_DB)) as typeof POKEMON_DB;
  let pokeUpdatedCount = 0;

  for (const [coreId, corePoke] of Object.entries(updatedPokemonDb)) {
    const normId = normalizeId(coreId);
    const sdPoke = sdPokemonMap.get(normId);

    if (sdPoke) {
      const tempPoke = corePoke as unknown as MutablePokemon;
      
      // Sincronizar estadísticas
      tempPoke.hp = sdPoke.baseStats.hp;
      tempPoke.atk = sdPoke.baseStats.atk;
      tempPoke.def = sdPoke.baseStats.def;
      tempPoke.spa = sdPoke.baseStats.spa;
      tempPoke.spd = sdPoke.baseStats.spd;
      tempPoke.spe = sdPoke.baseStats.spe;

      // Sincronizar tipos
      if (sdPoke.types && sdPoke.types[0]) {
        const typeEng = REVERSE_TYPE_MAP[sdPoke.types[0]];
        if (typeEng) {
          tempPoke.type = typeEng;
        }
      }
      if (sdPoke.types && sdPoke.types[1]) {
        const type2Eng = REVERSE_TYPE_MAP[sdPoke.types[1]];
        if (type2Eng) {
          tempPoke.type2 = type2Eng;
        } else {
          delete tempPoke.type2;
        }
      } else {
        delete tempPoke.type2;
      }

      // REGENERAR LEARNSET OFICIAL (GEN 3) WALKING UP PRE-EVOLUCIONES
      const movesMap = new Map<string, number>();
      let currentId: string | undefined = normId;

      while (currentId) {
        const sdLearnset = await Dex.forGen(ACTIVE_GENERATION).learnsets.get(currentId);
        if (sdLearnset && sdLearnset.learnset) {
          for (const [moveId, sources] of Object.entries(sdLearnset.learnset)) {
            for (const src of sources) {
              if (src.startsWith(ACTIVE_GENERATION + 'L')) {
                const level = parseInt(src.slice(2), 10);
                if (!movesMap.has(moveId) || movesMap.get(moveId)! > level) {
                  movesMap.set(moveId, level);
                }
              }
            }
          }
        }
        const speciesInfo = Dex.forGen(ACTIVE_GENERATION).species.get(currentId);
        currentId = speciesInfo.prevo ? toID(speciesInfo.prevo) : undefined;
      }

      const generatedLearnset: Array<{ lv: number; id: string; name: string; pp: number }> = [];
      for (const [moveId, level] of movesMap.entries()) {
        const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);
        if (moveData.exists) {
          const translated = (showdownDB.moves as Record<string, { name?: string }>)[moveId] || {};
          const espName = translated.name || moveData.name;
          const finalId = existingMoveIds.get(moveId) || moveData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          generatedLearnset.push({
            lv: level,
            id: finalId,
            name: espName,
            pp: moveData.pp
          });
        }
      }

      // Ordenar cronológicamente por nivel y reasignar
      tempPoke.learnset = generatedLearnset.sort((a, b) => a.lv - b.lv);
      pokeUpdatedCount++;
    }
  }

  // Escribir pokemonDB.ts
  const serializedPokemonDB = `export const POKEMON_DB = ${JSON.stringify(updatedPokemonDb, null, 2)};\n`;
  await fs.writeFile(POKEMON_DB_FILE, serializedPokemonDB, 'utf8');
  console.log(styleText('green', `✅ Guardado pokemonDB.ts con learnsets oficiales (${pokeUpdatedCount} Pokémon sincronizados).`));

  console.log(styleText('bold', styleText('green', '\n🎉 ¡Sincronización de base de datos finalizada con éxito!')));
}

main().catch((err) => {
  console.error(styleText('red', `❌ Error inesperado: ${(err as Error).stack}`));
  process.exit(1);
});
