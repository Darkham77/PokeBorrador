import { FIRE_RED_MAPS } from '@/data/world/maps';
import type { MapLocation } from '@/types/pokemon/encounters';
import { MAP_BIOME_KEYS } from '@/logic/constants/encounters';

export type MapBiomeKey = (typeof MAP_BIOME_KEYS)[number];

/**
 * Resolves the active biome and tags for a given location ID.
 */
export function getMapBiomeAndTags(locationId: string): { activeBiome: MapBiomeKey; mapTags: MapBiomeKey[] } {
  const map = FIRE_RED_MAPS.find(m => m.id === locationId);
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
