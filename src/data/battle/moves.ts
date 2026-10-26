/**
 * src/data/battle/moves.ts
 *
 * Wrapper to export MOVE_TRANSLATIONS_ES loaded from JSON.
 */
import dbJson from './moves.json' with { type: 'json' };

export const MOVE_TRANSLATIONS_ES = dbJson;
export type PokemonMoveId = keyof typeof MOVE_TRANSLATIONS_ES;
const MOVE_CATEGORIES = ['physical', 'special', 'status'] as const;
export type MoveCategory = (typeof MOVE_CATEGORIES)[number];
const MOVE_CATEGORY_SET: ReadonlySet<string> = new Set<string>(MOVE_CATEGORIES);

export function isMoveCategory(value: unknown): value is MoveCategory {
  return typeof value === 'string' && MOVE_CATEGORY_SET.has(value);
}

export function isPokemonMoveId(value: string): value is PokemonMoveId {
  return value in MOVE_TRANSLATIONS_ES;
}

export function requirePokemonMoveId(value: string): PokemonMoveId {
  if (isPokemonMoveId(value)) return value;
  throw new Error(`[moves] Invalid Pokemon Showdown move id: ${value}`);
}
