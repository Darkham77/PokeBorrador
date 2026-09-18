/**
 * src/loaders/pokedexDataLoader.ts
 *
 * Declarative Vue Router 5 Data Loader for Pokedex Module.
 * Leverages `defineBasicLoader` from `vue-router/experimental` to verify
 * pokedex state on navigation.
 */

import { defineBasicLoader } from 'vue-router/experimental';
import { useGameStore } from '@/stores/game';

interface PokedexLoaderData {
  readonly caughtCount: number;
  readonly seenCount: number;
  readonly loadedAt: number;
}

export const usePokedexDataLoader = defineBasicLoader('/pokedex', async (): Promise<PokedexLoaderData> => {
  const gameStore = useGameStore();
  const pokedex = gameStore.state.pokedex || [];
  const seenPokedex = gameStore.state.seenPokedex || [];

  return {
    caughtCount: pokedex.length,
    seenCount: seenPokedex.length,
    loadedAt: Temporal.Now.instant().epochMilliseconds
  };
});
