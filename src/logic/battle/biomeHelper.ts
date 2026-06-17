import { FIRE_RED_MAPS } from '@/data/world/maps';

/**
 * Resolves the active biome and tags for a given location ID.
 */
export function getMapBiomeAndTags(locationId: string): { activeBiome: string; mapTags: string[] } {
  const map = FIRE_RED_MAPS.find(m => m.id === locationId);
  let activeBiome = 'isPlains';
  const mapTags: string[] = [];
  if (map) {
    const hierarchy = [
      'isArctic', 'isIndoors', 'isUrban', 'isVolcanic', 'isCrystalCave', 'isCave',
      'isDesert', 'isSwamp', 'isMountain',
      'isCoastal', 'isForest', 'isPlains'
    ];
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        activeBiome = key;
        break;
      }
    }
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        mapTags.push(key);
      }
    }
  }
  return { activeBiome, mapTags };
}
