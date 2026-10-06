import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTradeStore } from '@/stores/trade';
import { useGameStore } from '@/stores/game';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Trade Store Lifecycle & Validation Suite (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default empty state and reactive collections', () => {
    const tradeStore = useTradeStore();
    expect(tradeStore.tradeTarget).toBeNull();
    expect(tradeStore.tradeFriendSave).toBeNull();
    expect(tradeStore.tradeOfferPoke).toBeNull();
    expect(tradeStore.tradeRequestPoke).toBeNull();
    expect(tradeStore.pendingIncoming).toEqual([]);
    expect(tradeStore.pendingOutgoing).toEqual([]);
    expect(tradeStore.pendingAccepted).toEqual([]);
    expect(tradeStore.pendingCount).toBe(0);
    expect(tradeStore.lockedUids.size).toBe(0);
  });

  it('updates target and resets items on openTradeModal', async () => {
    const tradeStore = useTradeStore();
    const gameStore = useGameStore();

    gameStore.db.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { save_data: { inventory: { potion: 5 }, money: 100 } },
            error: null
          })
        })
      })
    }) as any;

    await tradeStore.openTradeModal('friend-uuid-1', 'FriendRed');

    expect(tradeStore.tradeTarget).toEqual({ id: 'friend-uuid-1', username: 'FriendRed' });
    expect(tradeStore.tradeOfferPoke).toBeNull();
    expect(tradeStore.tradeFriendSave).toBeDefined();
  });

  it('computes lockedUids correctly from pendingIncoming and pendingOutgoing', () => {
    const tradeStore = useTradeStore();

    tradeStore.pendingIncoming = [
      {
        id: 'trade-1',
        sender_id: 'user-2',
        receiver_id: 'user-1',
        status: 'pending',
        request_pokemon: { uid: 'poke-locked-in' } as any
      } as any
    ];

    tradeStore.pendingOutgoing = [
      {
        id: 'trade-2',
        sender_id: 'user-1',
        receiver_id: 'user-3',
        status: 'pending',
        offer_pokemon: { uid: 'poke-locked-out' } as any
      } as any
    ];

    expect(tradeStore.pendingCount).toBe(1);
    expect(tradeStore.lockedUids.has('poke-locked-in')).toBe(true);
    expect(tradeStore.lockedUids.has('poke-locked-out')).toBe(true);
    expect(tradeStore.lockedUids.has('poke-free')).toBe(false);
  });

  it('fails sendTradeOffer if no target is selected', async () => {
    const tradeStore = useTradeStore();
    const success = await tradeStore.sendTradeOffer({
      isGift: false,
      offerMoney: 100,
      requestMoney: 0,
      message: 'Hello'
    });
    expect(success).toBe(false);
  });

  it('validates money and offer content before sending trade offer', async () => {
    const tradeStore = useTradeStore();
    const gameStore = useGameStore();
    gameStore.state.money = 50;

    tradeStore.tradeTarget = { id: 'f-1', username: 'Ash' };

    // Nothing offered
    let success = await tradeStore.sendTradeOffer({
      isGift: false,
      offerMoney: 0,
      requestMoney: 0,
      message: ''
    });
    expect(success).toBe(false);

    // Insufficient money
    success = await tradeStore.sendTradeOffer({
      isGift: false,
      offerMoney: 100,
      requestMoney: 0,
      message: ''
    });
    expect(success).toBe(false);
  });

  it('blocks busy or already-locked pokemon from being offered', async () => {
    const tradeStore = useTradeStore();
    const gameStore = useGameStore();
    gameStore.state.money = 1000;
    tradeStore.tradeTarget = { id: 'f-1', username: 'Ash' };

    // Busy pokemon (e.g. Daycare)
    tradeStore.tradeOfferPoke = {
      uid: 'poke-daycare',
      tags: ['daycare']
    } as unknown as Pokemon;

    let success = await tradeStore.sendTradeOffer({
      isGift: false,
      offerMoney: 10,
      requestMoney: 0,
      message: ''
    });
    expect(success).toBe(false);

    // Already locked in another pending offer
    tradeStore.pendingOutgoing = [{
      id: 'trade-9',
      status: 'pending',
      offer_pokemon: { uid: 'poke-active' } as any
    } as any];

    tradeStore.tradeOfferPoke = {
      uid: 'poke-active',
      tags: []
    } as unknown as Pokemon;

    success = await tradeStore.sendTradeOffer({
      isGift: false,
      offerMoney: 10,
      requestMoney: 0,
      message: ''
    });
    expect(success).toBe(false);
  });
});
