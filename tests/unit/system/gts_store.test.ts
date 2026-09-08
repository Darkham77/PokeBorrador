import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGTSStore } from '../../../src/stores/gts.ts';
import { useGameStore } from '../../../src/stores/game.ts';
import { useUIStore } from '../../../src/stores/ui.ts';
import type { MarketListing } from '../../../src/logic/economy/market.ts';

describe('GTS Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ui = useUIStore();
    ui.notify = vi.fn();
    ui.setLoading = vi.fn();
  });

  it('handles cancellation successfully', async () => {
    const gts = useGTSStore();
    const game = useGameStore();
    const ui = useUIStore();

    // Mock RPC
    game.db.rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    game.fetchClaimQueue = vi.fn().mockResolvedValue([]);
    
    // We need to mock fetchUserData to avoid actual DB calls
    // Since fetchUserData is private or internal, we can't easily mock it unless we exported it.
    // However, we can mock the entire game.db.from chain if needed.

    const result = await gts.cancelListing('123');

    expect(result).toBe(true);
    expect(ui.setLoading).toHaveBeenCalledWith(true);
    expect(ui.setLoading).toHaveBeenCalledWith(false);
    expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Publicación cancelada'), '✅');
  });

  it('handles cancellation errors', async () => {
    const gts = useGTSStore();
    const game = useGameStore();
    const ui = useUIStore();

    game.db.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not authorized' } });

    const result = await gts.cancelListing('123');

    expect(result).toBe(false);
    expect(ui.notify).toHaveBeenCalledWith('Not authorized', '❌');
  });

  it('handles buying a listing successfully', async () => {
    const gts = useGTSStore();
    const game = useGameStore();
    const ui = useUIStore();

    const mockListing: MarketListing = { 
      id: 'list-1', 
      price: 100, 
      listing_type: 'item', 
      data: { name: 'Potion' },
      status: 'active',
      seller_id: 'seller-1',
      created_at: Temporal.Now.instant().toString()
    };
    game.state.money = 500;
    game.db.rpc = vi.fn().mockResolvedValue({ data: { money: 400 }, error: null });
    game.fetchClaimQueue = vi.fn().mockResolvedValue([]);

    const result = await gts.buyListing(mockListing);

    expect(result).toBe(true);
    expect(ui.setLoading).toHaveBeenCalledWith(true);
    expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Compra exitosa'), '✅');
  });

  it('correctly categorizes sales vs purchases claims and unifies GTS count', () => {
    const gts = useGTSStore();
    const game = useGameStore();
    const now = Temporal.Now.instant().toString();

    game.state.claimQueue = [
      {
        id: 'claim-1',
        source_type: 'gts',
        source_id: 'list-1',
        created_at: now,
        asset_data: { type: 'money', data: 950 }
      },
      {
        id: 'claim-2',
        source_type: 'gts',
        source_id: 'list-2',
        created_at: now,
        asset_data: { type: 'pokemon', data: { name: 'Rattata', species: 'rattata' } }
      },
      {
        id: 'claim-3',
        source_type: 'gts_cancel',
        source_id: 'list-3',
        created_at: now,
        asset_data: { type: 'item', data: { name: 'potion', qty: 5 } }
      },
      {
        id: 'claim-4',
        source_type: 'event',
        source_id: 'event-1',
        created_at: now,
        asset_data: { type: 'money', data: 1000 }
      }
    ];

    expect(gts.pendingSalesClaims.length).toBe(1);
    expect(gts.unclaimedSalesCount).toBe(1);

    expect(gts.pendingPurchaseClaims.length).toBe(2);
    expect(gts.unclaimedPurchasesCount).toBe(2);

    expect(gts.allPendingGtsClaims.length).toBe(3);
    expect(gts.unclaimedGtsCount).toBe(3);
  });
});
