import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { getExpNeededPure } from './statsMath.ts';

export function levelUpPokemon(
  p: Pokemon,
  recalcStatsFn: (p: Pokemon) => void
): Move[] | null {
  if (p.level >= MAX_POKEMON_LEVEL) return [];
  // Everstone block
  if (p.heldItem === 'everstone') return null;

  p.level++;
  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = 0;
  } else {
    p.expNeeded = getExpNeededPure(p.level);
  }
  const oldMaxHp = p.maxHp;
  recalcStatsFn(p);
  const hpGain = p.maxHp - oldMaxHp;
  if (hpGain > 0) p.hp += hpGain;
  p.hp = Math.min(p.hp, p.maxHp);

  // Learn moves
  const base = pokemonDataProvider.getPokemonData(p.id);
  const pendingMoves: Move[] = [];
  if (base && base.learnset) {
    base.learnset.filter(m => m.lv === p.level).forEach(m => {
      if (!m.id) throw new Error(`[levelUpPokemon] El movimiento en el learnset no tiene un ID válido.`);
      // Check if already knows the move by ID
      if (!p.moves.find(em => em && em.id === m.id)) {
        const moveData = pokemonDataProvider.getMoveData(m.id);
        if (!moveData) throw new Error(`[levelUpPokemon] No se encontró información para el movimiento: ${m.id}`);
        const moveObj: Move = {
          id: m.id,
          name: moveData.name,
          pp: m.pp || moveData.pp,
          maxPP: m.pp || moveData.pp
        };
        if (p.moves.length < 4) {
          p.moves.push(moveObj);
        } else {
          pendingMoves.push(moveObj);
        }
      }
    });
  }
  return pendingMoves;
}
