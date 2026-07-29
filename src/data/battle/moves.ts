/**
 * src/data/battle/moves.ts
 * 
 * Wrapper to export MOVE_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './moves.json' with { type: 'json' };

export const MOVE_TRANSLATIONS_ES = dbJson;
export type MoveId = keyof typeof MOVE_TRANSLATIONS_ES;
export type PokemonMoveId = MoveId;

function isPokemonMoveId(value: string): value is PokemonMoveId {
  return value in MOVE_TRANSLATIONS_ES;
}

export function requirePokemonMoveId(value: string): PokemonMoveId {
  if (isPokemonMoveId(value)) return value;
  throw new Error(`[moves] Invalid Pokemon Showdown move id: ${value}`);
}
