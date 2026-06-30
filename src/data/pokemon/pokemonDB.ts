import { Dex, toID } from '@pkmn/sim';
import type { PokemonBaseData } from '@/types/system/database';
import { ACTIVE_GENERATION, IMPLEMENTED_GENERATION } from '../system/constants.ts';
import { MOVE_TRANSLATIONS_ES } from '../battle/moves.ts';
import { SPECIES_METADATA } from './speciesMetadata.ts';

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

const maxDexNum = MAX_DEX_NUMS[IMPLEMENTED_GENERATION] ?? 1025;
const allSpecies = Dex.forGen(ACTIVE_GENERATION).species.all();
const db: Record<string, PokemonBaseData> = {};

for (const species of allSpecies) {
  if (species.num <= 0 || species.num > maxDexNum) {
    continue;
  }

  const speciesId = toID(species.id);
  const type = (species.types[0] ?? '').toLowerCase();
  const type2 = species.types[1] ? species.types[1].toLowerCase() : undefined;

  const movesMap = new Map<string, number>();
  let currentId: string | undefined = species.id;

  // Recorremos pre-evoluciones para heredar movimientos de nivel
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
          const match = src.match(/^(\d+)L(\d+)$/);
          if (match) {
            const level = parseInt(match[2]!, 10);
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
    if (moveData.exists && moveData.isNonstandard !== 'Past') {
      const translated = MOVE_TRANSLATIONS_ES[moveId];
      const espName = translated ? translated.name : moveData.name;
      learnset.push({
        lv: level,
        id: moveId,
        name: espName,
        pp: moveData.pp
      });
    }
  }
  learnset.sort((a, b) => a.lv - b.lv);

  const metadata = SPECIES_METADATA[speciesId];

  db[speciesId] = {
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
}

export const POKEMON_DB = db;
