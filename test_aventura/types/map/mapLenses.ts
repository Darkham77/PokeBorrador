/**
 * Map lens domain definitions.
 * Governs the active visual and functional layer of the world map.
 */

export const MAP_LENSES = ['adventure', 'war', 'pokedex'] as const;

export type MapLens = (typeof MAP_LENSES)[number];

const MAP_LENS_MAP: Record<MapLens, true> = {
  adventure: true,
  war: true,
  pokedex: true
};

/**
 * Type guard to check if a value is a valid MapLens.
 */
export function isMapLens(value: string): value is MapLens {
  return value in MAP_LENS_MAP;
}

/**
 * Requires a valid MapLens, throwing an Error if invalid.
 */
export function requireMapLens(value: string): MapLens {
  if (isMapLens(value)) {
    return value;
  }
  throw new Error(`[DomainTypeFirst] Invalid MapLens: "${value}". Expected one of: ${MAP_LENSES.join(', ')}`);
}
