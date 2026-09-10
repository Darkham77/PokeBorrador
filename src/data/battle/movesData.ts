/**
 * src/data/battle/movesData.ts
 *
 * Precomputed static moves database loaded from JSON.
 * Avoids @pkmn/sim Dex overhead in browser runtime bundle.
 */
import movesDataJson from './movesData.json' with { type: 'json' };
import type { MoveBaseData } from '@/types/system/database.ts';
import type { PokemonMoveId } from './moves.ts';

export const MOVES_DATABASE: Readonly<Record<PokemonMoveId, MoveBaseData>> = (movesDataJson as Record<string, unknown>) as Readonly<Record<PokemonMoveId, MoveBaseData>>; // open-record: Generic key-value data dictionary container

export function hasMoveData(id: string): id is PokemonMoveId {
  return Object.hasOwn(MOVES_DATABASE, id);
}

export function getStaticMoveData(id: PokemonMoveId): MoveBaseData | undefined { // result-ok: Operation result wrapper payload
  return MOVES_DATABASE[id];
}
