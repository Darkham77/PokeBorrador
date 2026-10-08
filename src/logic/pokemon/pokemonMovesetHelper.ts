/**
 * src/logic/pokemon/pokemonMovesetHelper.ts
 *
 * Resolves learnsets and move progression at given level.
 */

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getSpeciesHistory } from '@/logic/pokemon/evolutionEngine';
import { isEnabledPokemonId } from '@/data/system/constants';
import type { MoveCategory } from '@/data/battle/moves';
import type { Move } from '@/types/pokemon/pokemon';
import type { LearnsetMove } from '@/types/system/database';
import {
  MAX_LEARNED_MOVES_SLOTS,
  DEFAULT_ACCURACY_BASE_STAT
} from '@/logic/constants/gameplay';

/**
 * Get moves a pokemon knows at a given level (up to 4, most recent)
 */
export function getMovesAtLevel(id: string, level: number, bypassWhitelist = false): Move[] {
  const history = getSpeciesHistory(id);
  const allPotentialMoves: LearnsetMove[] = [];
  const seenNames = new Set<string>();

  history.forEach(spId => {
    if (!bypassWhitelist && !isEnabledPokemonId(spId)) return;
    const db = pokemonDataProvider.getPokemonData(spId, bypassWhitelist);
    if (db && db.learnset) {
      (db.learnset as LearnsetMove[]).forEach(m => {
        if (m.lv <= level) {
          allPotentialMoves.push(m);
        }
      });
    }
  });

  allPotentialMoves.sort((a, b) => a.lv - b.lv);

  const uniqueMoves: LearnsetMove[] = [];
  for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
    const m = allPotentialMoves[i];
    if (m && !seenNames.has(m.name)) {
      uniqueMoves.unshift(m);
      seenNames.add(m.name);
    }
  }

  const last4 = uniqueMoves.slice(-MAX_LEARNED_MOVES_SLOTS);
  return last4.map(m => {
    if (!m.id) throw new Error(`[getMovesAtLevel] El movimiento en el learnset no tiene un ID válido.`);
    const moveData = pokemonDataProvider.getMoveData(m.id);
    if (!moveData) throw new Error(`[getMovesAtLevel] No se encontró información para el movimiento: ${m.id}`);
    return { 
      id: m.id,
      name: moveData.name || '???', 
      pp: m.pp || moveData.pp, 
      maxPP: m.pp || moveData.pp,
      type: moveData.type || 'normal',
      power: moveData.power || 0,
      acc: moveData.acc || DEFAULT_ACCURACY_BASE_STAT,
      cat: moveData.cat as MoveCategory,
      priority: moveData.priority,
      effect: moveData.effect,
      recoil: moveData.recoil,
      selfKO: moveData.selfKO,
      drain: moveData.drain,
      hits: moveData.hits,
      fixedDmg: moveData.fixedDmg,
      ohko: moveData.ohko,
      halfHP: moveData.halfHP,
      endeavor: moveData.endeavor,
      levelDmg: moveData.levelDmg,
      counter: moveData.counter,
      turns: moveData.turns,
      sound: moveData.sound
    };
  });
}
