
/**
 * src/logic/map/mapCardHelper.ts
 * Extracted pure logic for MapCard UI.
 */

export function normalizeFaction(faction: string | null | undefined): string {
  if (!faction) return ''
  const lower = faction.toLowerCase() // text-ok: UI text display localization string
  if (lower === 'poder' || lower === 'power') return 'power'
  if (lower === 'unión' || lower === 'union') return 'union'
  return lower
}

export function checkPlayerWinner(routeWinner: string | null | undefined, playerFaction: string | null | undefined): boolean {
  if (!routeWinner || routeWinner === 'none') return false
  return normalizeFaction(routeWinner) === normalizeFaction(playerFaction)
}

export function calculateSpawnGrid(spawnsCount: number, preferredCols: number = 3): { rows: number; cols: number; totalSlots: number } {
  if (spawnsCount === 0) return { rows: 0, cols: 0, totalSlots: 0 }
  
  let cols = Math.max(3, preferredCols)
  
  // For very small counts, we might want to stay with 3 columns to avoid 
  // a single row of 5 if preferredCols is 5, but the user specifically 
  // asked for 3-5 range flexibility. 
  // However, we maintain a minimum of 3 cols for consistency.

  // If spawnsCount is high and sqrt(count) > cols, we expand cols 
  // to maintain a more balanced grid.
  const idealCols = Math.ceil(Math.sqrt(spawnsCount))
  if (idealCols > cols) {
    cols = idealCols
  }

  let rows = Math.ceil(spawnsCount / cols)
  
  // To maintain size consistency, we always want at least 2 rows.
  if (rows < 2 && spawnsCount > 0) {
    rows = 2
  }
  
  return { rows, cols, totalSlots: rows * cols }
}

import type { MapLocation } from '@/types/pokemon/encounters';

import type { MapRouteId } from '@/data/world/map-assets';

/**
 * Determina si un mapa/ruta se puede extorsionar (tiene salvajes y no es ciudad/pueblo/gimnasio).
 */
export function isMapExtortable(map?: MapLocation | null): boolean {
  if (!map || !map.wild || Object.keys(map.wild).length === 0) return false;
  const cities = [
    'pallet_town', 'viridian_city', 'pewter_city', 'cerulean_city', 
    'vermilion_city', 'lavender_town', 'celadon_city', 'fuchsia_city', 
    'saffron_city', 'cinnabar_island'
  ] as const satisfies readonly MapRouteId[];
  const isCity = (cities as readonly MapRouteId[]).includes(map.id);
  return !isCity && !map.id.includes('gym') && !map.id.includes('league');
}

const EXTORTION_DURATION_HOURS = 24;
const OFFICIAL_ROUTE_DURATION_MIN = 30;
const OFFICIAL_ROUTE_COOLDOWN_HOURS = 24;

/**
 * Obtiene el mensaje unificado de confirmación de extorsión.
 */
export function getExtortionConfirmMessage(mapName: string): string {
  return `REGLAS DE EXTORSISÓN:\n\n1. Al extorsionar una ruta, tomarás control de ella por las próximas ${EXTORTION_DURATION_HOURS} horas.\n2. Los pesos (₽) ganados contra entrenadores (NPCs) en esta ruta se multiplicarán por x1.5.\n3. Solo puedes extorsionar una ruta a la vez.\n\n¿Quieres extorsionar la ${mapName.toUpperCase()} hoy?`; // text-ok: UI text display localization string
}

/**
 * Obtiene el mensaje unificado de confirmación de ruta oficial.
 */
export function getOfficialRouteConfirmMessage(mapName: string): string {
  return `REGLAS DE RUTA OFICIAL:\n\n1. La Ruta Oficial te permite declarar una zona de patrullaje especial.\n2. Durante los próximos ${OFFICIAL_ROUTE_DURATION_MIN} minutos, cada combate ganado aquí otorgará +1 punto de Reputación.\n3. Solo puedes marcar una ruta oficial una vez cada ${OFFICIAL_ROUTE_COOLDOWN_HOURS} horas.\n\n¿Quieres marcar la ${mapName.toUpperCase()} como tu Ruta Oficial?`; // text-ok: UI text display localization string
}
