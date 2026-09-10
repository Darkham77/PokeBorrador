/**
 * src/data/pokemon/eggMoves.ts
 *
 * Precomputed egg moves for all species across Gen 1–9.
 * Avoids loading @pkmn/sim Dex into the client runtime.
 */
import eggMovesJson from './eggMoves.json' with { type: 'json' };
import type { PokemonMoveId } from '../battle/moves.ts';
import type { PokemonSpeciesId } from './pokedex.ts';

const EGG_MOVES_MAP: Partial<Record<PokemonSpeciesId, readonly PokemonMoveId[]>> = eggMovesJson as Partial<Record<PokemonSpeciesId, readonly PokemonMoveId[]>>;
const EMPTY_MOVES: readonly PokemonMoveId[] = Object.freeze([]);

export function getSpeciesEggMoves(speciesId: PokemonSpeciesId): readonly PokemonMoveId[] {
  return EGG_MOVES_MAP[speciesId] ?? EMPTY_MOVES;
}
