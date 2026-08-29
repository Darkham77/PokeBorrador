import { MAPS_BY_ROUTE_ID } from '@/data/world/maps';
import { isMapRouteId } from '@/data/world/map-assets';
import { MAP_BIOME_KEYS, type MapBiomeKey } from '@/logic/constants/encounters';

/**
 * Resolves the active biome and tags for a given location ID.
 */
export function getMapBiomeAndTags(locationId: string): { activeBiome: MapBiomeKey; mapTags: MapBiomeKey[] } {
  const map = isMapRouteId(locationId) ? MAPS_BY_ROUTE_ID[locationId] : undefined;
  let activeBiome: MapBiomeKey = 'isPlains';
  const mapTags: MapBiomeKey[] = [];
  if (map) {
    for (const key of MAP_BIOME_KEYS) {
      if (map[key]) {
        activeBiome = key;
        break;
      }
    }
    for (const key of MAP_BIOME_KEYS) {
      if (map[key]) {
        mapTags.push(key);
      }
    }
  }
  return { activeBiome, mapTags };
}
