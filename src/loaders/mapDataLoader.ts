/**
 * src/loaders/mapDataLoader.ts
 *
 * Declarative Vue Router 5 Data Loader for Map/World Module.
 * Leverages `defineBasicLoader` from `vue-router/experimental` to preload
 * map routes and active player map location on navigation.
 */

import { defineBasicLoader } from 'vue-router/experimental';
import { useMapStore } from '@/stores/map';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { MapRouteId } from '@/data/world/map-assets';

interface MapLoaderData {
  readonly currentMapId: MapRouteId;
  readonly totalMapsCount: number;
  readonly loadedAt: number;
}

export const useMapDataLoader = defineBasicLoader('/', async (): Promise<MapLoaderData> => {
  const mapStore = useMapStore();
  const maps = pokemonDataProvider.getMaps();

  return {
    currentMapId: mapStore.currentMap,
    totalMapsCount: maps.length,
    loadedAt: Temporal.Now.instant().epochMilliseconds
  };
});
