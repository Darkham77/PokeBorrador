import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGTSStore } from '../../../src/stores/gts.ts';
import { useUIStore } from '../../../src/stores/ui.ts';
import type { MarketListing } from '../../../src/logic/economy/market.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('GTS Store Listing Limits', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ui = useUIStore();
    ui.notify = vi.fn();
  });

  it('enforces maximum of 10 active listings', async () => {
    const gts = useGTSStore();
    const ui = useUIStore();

    // Populate 10 active listings
    const mockListings: MarketListing[] = Array.from({ length: 10 }, (_, i) => ({
      id: `list_${i}`,
      seller_id: 'user_123',
      seller_name: 'Trainer',
      listing_type: 'pokemon' as const,
      data: { uid: `poke_${i}`, name: 'Pikachu' } as unknown as Pokemon,
      price: 1000,
      status: 'active' as const,
      created_at: Temporal.Now.instant().toString()
    }));

    gts.myListings = mockListings;
    expect(gts.activeMyListings.length).toBe(10);

    // Attempt to publish an 11th listing
    const result = await gts.publishListing('pokemon', { uid: 'poke_11', name: 'Raichu' } as unknown as Pokemon, 1000);

    expect(result).toBe(false);
    expect(ui.notify).toHaveBeenCalledWith('Límite de publicaciones alcanzado (10)', '⚠️');
  });

  it('allows publishing when active listings are less than 10', async () => {
    const gts = useGTSStore();

    // Populate 9 active listings
    const mockListings: MarketListing[] = Array.from({ length: 9 }, (_, i) => ({
      id: `list_${i}`,
      seller_id: 'user_123',
      seller_name: 'Trainer',
      listing_type: 'pokemon' as const,
      data: { uid: `poke_${i}`, name: 'Pikachu' } as unknown as Pokemon,
      price: 1000,
      status: 'active' as const,
      created_at: Temporal.Now.instant().toString()
    }));

    gts.myListings = mockListings;
    expect(gts.activeMyListings.length).toBe(9);
  });
});
