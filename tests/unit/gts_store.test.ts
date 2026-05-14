import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGTSStore } from '../../src/stores/gts';
import { useGameStore } from '../../src/stores/game';
import { useUIStore } from '../../src/stores/ui';
import type { MarketListing } from '../../src/logic/market';

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
      created_at: new Date().toISOString()
    };
    game.state.money = 500;
    game.db.rpc = vi.fn().mockResolvedValue({ data: { money: 400 }, error: null });
    game.fetchClaimQueue = vi.fn().mockResolvedValue([]);

    const result = await gts.buyListing(mockListing);

    expect(result).toBe(true);
    expect(ui.setLoading).toHaveBeenCalledWith(true);
    expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Compra exitosa'), '✅');
  });
});
