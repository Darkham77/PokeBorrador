import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, IMPLEMENTED_GENERATION } from '../../src/data/system/constants.ts';
import { MOVE_TRANSLATIONS_ES } from '../../src/data/battle/moves.ts';
import { SPECIES_METADATA } from '../../src/data/pokemon/speciesMetadata.ts';

enableCompileCache();

const POKEMON_DB_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.ts');
const POKEMON_DB_JSON_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.json');
const EVOLUTION_DATA_FILE = path.resolve(process.cwd(), 'src/data/pokemon/evolutionData.ts');
const EVOLUTION_DATA_JSON_FILE = path.resolve(process.cwd(), 'src/data/pokemon/evolutionData.json');

const MAX_DEX_NUMS: Record<number, number> = {
  1: 151,
  2: 251,
  3: 386,
  4: 493,
  5: 649,
  6: 721,
  7: 809,
  8: 905,
  9: 1025
};

const STONE_MAP: Record<string, string> = {
  'Fire Stone': 'Piedra Fuego',
  'Water Stone': 'Piedra Agua',
  'Thunder Stone': 'Piedra Trueno',
  'Leaf Stone': 'Piedra Hoja',
  'Moon Stone': 'Piedra Lunar',
  'Sun Stone': 'Piedra Solar',
  'Shiny Stone': 'Piedra Día',
  'Dusk Stone': 'Piedra Noche',
  'Dawn Stone': 'Piedra Alba',
  'Ice Stone': 'Piedra Hielo'
};

function toGameId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log(styleText('bold', '\n--- 🔄 INICIANDO ACCIÓN DE SINCRONIZACIÓN Y REGENERACIÓN DE BASE DE DATOS Y EVOLUCIONES ---'));

  const maxDexNum = MAX_DEX_NUMS[IMPLEMENTED_GENERATION] ?? 1025;
  const allSpecies = Dex.forGen(ACTIVE_GENERATION).species.all();

  const POKEMON_DB: Record<string, unknown> = {};
  const EVOLUTION_TABLE: Record<string, unknown> = {};
  const STONE_EVOLUTIONS: Record<string, unknown> = {};
  const TRADE_EVOLUTIONS: Record<string, unknown> = {};

  let syncedCount = 0;

  for (const species of allSpecies) {
    // Filtrar por generación implementada
    if (species.num <= 0 || species.num > maxDexNum) {
      continue;
    }

    const speciesId = toGameId(species.id);

    // 1. Sincronizar estadísticas y tipos en POKEMON_DB
    const type = (species.types[0] ?? '').toLowerCase();
    const type2 = species.types[1] ? species.types[1].toLowerCase() : undefined;

    // REGENERAR LEARNSET OFICIAL WALKING UP PRE-EVOLUCIONES
    const movesMap = new Map<string, number>();
    let currentId: string | undefined = species.id;

    while (currentId) {
      let sdLearnset = await Dex.forGen(ACTIVE_GENERATION).learnsets.get(currentId);
      if (!sdLearnset || !sdLearnset.learnset || Object.keys(sdLearnset.learnset).length === 0) {
        for (let g = ACTIVE_GENERATION - 1; g >= 3; g--) {
          const temp = await Dex.forGen(g).learnsets.get(currentId);
          if (temp && temp.learnset && Object.keys(temp.learnset).length > 0) {
            sdLearnset = temp;
            break;
          }
        }
      }
      if (sdLearnset && sdLearnset.learnset) {
        for (const [moveId, sources] of Object.entries(sdLearnset.learnset)) {
          for (const src of sources) {
            // Match level-up moves across any generation (e.g. '9L12', '8L15', '7L10')
            const match = src.match(/^(\d+)L(\d+)$/);
            if (match) {
              const level = parseInt(match[2]!, 10);
              // Solo nos quedamos con el nivel más bajo encontrado para este movimiento
              if (!movesMap.has(moveId) || movesMap.get(moveId)! > level) {
                movesMap.set(moveId, level);
              }
            }
          }
        }
      }
      const speciesInfo = Dex.forGen(ACTIVE_GENERATION).species.get(currentId);
      if (speciesInfo.prevo) {
        currentId = toID(speciesInfo.prevo);
      } else if (speciesInfo.baseSpecies && toID(speciesInfo.baseSpecies) !== currentId) {
        currentId = toID(speciesInfo.baseSpecies);
      } else {
        currentId = undefined;
      }
    }

    const learnset: Array<{ lv: number; id: string; name: string; pp: number }> = [];
    for (const [moveId, level] of movesMap.entries()) {
      const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(moveId);
      if (moveData.exists) {
        const translated = MOVE_TRANSLATIONS_ES[moveId];
        const espName = translated ? translated.name : moveData.name;
        const finalId = moveId;
        learnset.push({
          lv: level,
          id: finalId,
          name: espName,
          pp: moveData.pp
        });
      }
    }
    learnset.sort((a, b) => a.lv - b.lv);

    const metadata = SPECIES_METADATA[speciesId];

    POKEMON_DB[speciesId] = {
      name: species.name,
      type,
      type2,
      hp: species.baseStats.hp,
      atk: species.baseStats.atk,
      def: species.baseStats.def,
      spa: species.baseStats.spa,
      spd: species.baseStats.spd,
      spe: species.baseStats.spe,
      catchRate: metadata?.catchRate ?? 45,
      learnset
    };

    // 2. Extraer datos de evoluciones
    if (species.evos && species.evos.length > 0) {
      for (const evo of species.evos) {
        const evoSpecies = Dex.forGen(ACTIVE_GENERATION).species.get(evo);
        if (evoSpecies && evoSpecies.exists && evoSpecies.num > 0 && evoSpecies.num <= maxDexNum) {
          const evoId = toGameId(evoSpecies.id);
          
          if (evoSpecies.evoType === 'trade') {
            TRADE_EVOLUTIONS[speciesId] = evoId;
          } else if (evoSpecies.evoItem) {
            const stoneItemName = evoSpecies.evoItem;
            const stoneName = STONE_MAP[stoneItemName] || stoneItemName;
            let key = speciesId;
            if (speciesId === 'eevee') {
              const suffix = stoneItemName.toLowerCase().split(' ')[0] || '';
              key = `eevee_${suffix}`;
            } else if (speciesId === 'pikachu' && evoId === 'raichu') {
              key = 'pikachu'; // Pikachu normal a Raichu
            } else if (speciesId === 'pikachu' && evoId === 'raichualola') {
              key = 'pikachu_alola'; // Pikachu a Raichu Alola
            } else if (species.evos.length > 1) {
              // Si hay múltiples evoluciones posibles (como formas regionales), usar evoId como parte de la clave
              key = `${speciesId}_${evoId}`;
            }
            STONE_EVOLUTIONS[key] = { stone: stoneName, to: evoId };
          } else {
            const level = evoSpecies.evoLevel || 16; // default fallback para amistad/etc.
            EVOLUTION_TABLE[speciesId] = { level, to: evoId };
          }
        }
      }
    }

    syncedCount++;
  }

  // Guardar pokemonDB
  await fs.writeFile(POKEMON_DB_JSON_FILE, JSON.stringify(POKEMON_DB, null, 2), 'utf8');
  await fs.writeFile(
    POKEMON_DB_FILE,
    `/**
 * src/data/pokemon/pokemonDB.ts
 * 
 * Wrapper to export POKEMON_DB loaded from JSON.
 */
import type { PokemonBaseData } from '@/types/system/database';
import dbJson from './pokemonDB.json' with { type: 'json' };

export const POKEMON_DB = dbJson as Record<string, PokemonBaseData>;
`,
    'utf8'
  );

  // Guardar evolutionData
  const evolutionJson = {
    EVOLUTION_TABLE,
    STONE_EVOLUTIONS,
    TRADE_EVOLUTIONS
  };
  await fs.writeFile(EVOLUTION_DATA_JSON_FILE, JSON.stringify(evolutionJson, null, 2), 'utf8');
  await fs.writeFile(
    EVOLUTION_DATA_FILE,
    `/**
 * src/data/pokemon/evolutionData.ts
 * 
 * Wrapper to export evolution tables loaded from JSON.
 */
import dbJson from './evolutionData.json' with { type: 'json' };

export const EVOLUTION_TABLE = dbJson.EVOLUTION_TABLE as Record<string, { level: number; to: string }>;
export const STONE_EVOLUTIONS = dbJson.STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>;
export const TRADE_EVOLUTIONS = dbJson.TRADE_EVOLUTIONS as Record<string, string>;
`,
    'utf8'
  );

  console.log(styleText('green', `✅ Sincronizados y guardados datos de ${syncedCount} Pokémon.`));
  console.log(styleText('green', `✅ Generados pokemonDB.json/ts y evolutionData.json/ts.`));
}

main().catch((err) => {
  console.error(styleText('red', `❌ Error inesperado: ${(err as Error).stack}`));
  process.exit(1);
});
