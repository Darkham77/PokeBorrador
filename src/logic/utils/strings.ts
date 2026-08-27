/**
 * src/logic/utils/strings.ts
 * 
 * Lightweight string utilities for Poké Vicio.
 */
import type { ID } from '@pkmn/sim';

/**
 * Normalizes any text/string into a Showdown-compatible ID (lowercase alphanumeric string).
 * 
 * ⚠️ REGLA CRÍTICA DE MANTENIMIENTO:
 * Esta función es una réplica exacta y pura de la función `toID` de Pokémon Showdown
 * (ubicada canónicamente en `external/pokemon-showdown-code/sim/sim/dex-data.ts`).
 * En caso de que Pokémon Showdown modifique su implementación de `toID`,
 * se debe SIEMPRE COPIAR la función real de la librería para mantener paridad al 100%.
 */
export function toID(text: unknown): ID {
  if (text && typeof text === 'object' && 'id' in text) {
    text = (text as { id: unknown }).id;
  }
  if (typeof text !== 'string' && typeof text !== 'number') return '' as ID;
  return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}
