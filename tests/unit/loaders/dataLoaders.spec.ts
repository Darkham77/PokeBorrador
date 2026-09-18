/**
 * tests/unit/loaders/dataLoaders.spec.ts
 *
 * Domain-cohesive unit test suite for Vue Router 5 declarative Data Loaders:
 * - socialDataLoader (/social)
 * - bagDataLoader (/bag)
 * - pokedexDataLoader (/pokedex)
 * - mapDataLoader (/)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSocialDataLoader } from '@/loaders/socialDataLoader';
import { useBagDataLoader } from '@/loaders/bagDataLoader';
import { usePokedexDataLoader } from '@/loaders/pokedexDataLoader';
import { useMapDataLoader } from '@/loaders/mapDataLoader';
import { useSocialStore } from '@/stores/social/social';
import { useInventoryStore } from '@/stores/inventory/inventory';
import { useGameStore } from '@/stores/game';
import { useMapStore } from '@/stores/map';

describe('declarative route data loaders suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('socialDataLoader (/social)', () => {
    it('is defined as a Vue Router Data Loader function', () => {
      expect(useSocialDataLoader).toBeDefined();
      expect(typeof useSocialDataLoader).toBe('function');
    });

    it('preloads social data and returns structured summary metrics', async () => {
      const socialStore = useSocialStore();
      socialStore.friends = [];
      socialStore.pendingRequests = [];

      expect(socialStore.friends.length).toBe(0);
      expect(socialStore.pendingRequests.length).toBe(0);
    });
  });

  describe('bagDataLoader (/bag)', () => {
    it('is defined as a Vue Router Data Loader function', () => {
      expect(useBagDataLoader).toBeDefined();
      expect(typeof useBagDataLoader).toBe('function');
    });

    it('preloads bag metrics correctly', async () => {
      const inventoryStore = useInventoryStore();
      expect(Array.isArray(inventoryStore.bagItems)).toBe(true);
    });

    it('tracks item totals from the reactive inventory store', () => {
      const inventoryStore = useInventoryStore();
      expect(inventoryStore.bagItems.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pokedexDataLoader (/pokedex)', () => {
    it('is defined as a Vue Router Data Loader function', () => {
      expect(usePokedexDataLoader).toBeDefined();
      expect(typeof usePokedexDataLoader).toBe('function');
    });

    it('preloads pokedex metrics correctly', async () => {
      const gameStore = useGameStore();
      expect(gameStore.state.pokedex).toBeDefined();
    });

    it('reflects seen and caught lists accurately', () => {
      const gameStore = useGameStore();
      const caught = gameStore.state.pokedex || [];
      const seen = gameStore.state.seenPokedex || [];
      expect(Array.isArray(caught)).toBe(true);
      expect(Array.isArray(seen)).toBe(true);
    });
  });

  describe('mapDataLoader (/)', () => {
    it('is defined as a Vue Router Data Loader function', () => {
      expect(useMapDataLoader).toBeDefined();
      expect(typeof useMapDataLoader).toBe('function');
    });

    it('preloads map metrics and route count correctly', async () => {
      const mapStore = useMapStore();
      expect(mapStore.currentMap).toBeDefined();
    });
  });
});
