/**
 * src/loaders/bagDataLoader.ts
 *
 * Declarative Vue Router 5 Data Loader for Bag/Inventory Module.
 * Leverages `defineBasicLoader` from `vue-router/experimental` to prepare
 * inventory data asynchronously on navigation.
 */

import { defineBasicLoader } from 'vue-router/experimental';
import { useInventoryStore } from '@/stores/inventory/inventory';

interface BagLoaderData {
  readonly totalItemsCount: number;
  readonly loadedAt: number;
}

export const useBagDataLoader = defineBasicLoader('/bag', async (): Promise<BagLoaderData> => {
  const inventoryStore = useInventoryStore();

  return {
    totalItemsCount: inventoryStore.bagItems.length,
    loadedAt: Temporal.Now.instant().epochMilliseconds
  };
});
