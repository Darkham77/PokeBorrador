/**
 * src/logic/utils/strings.ts
 *
 * Lightweight string utilities for Poké Vicio.
 */
import type { ID } from '@pkmn/sim';

/**
 * Normalizes any text/string into a Showdown-compatible ID (lowercase alphanumeric string).
 *
 * ⚠️ CRITICAL MAINTENANCE RULE:
 * This function is an exact, pure replica of Pokémon Showdown's `toID` function
 * (located canonically in `external/pokemon-showdown-code/sim/sim/dex-data.ts`).
 * If Pokémon Showdown updates its `toID` implementation,
 * ALWAYS copy the real library function to maintain 100% parity.
 */
export function toID(text: unknown): ID {
  if (text && typeof text === 'object' && 'id' in text) {
    text = (text as { id: unknown }).id;
  }
  if (typeof text !== 'string' && typeof text !== 'number') return '' as ID;
  return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}
