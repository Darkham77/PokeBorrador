
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGTSStore } from '@/stores/gts'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import type { MarketListing } from '@/logic/market'
import type { DBRouter } from '@/logic/db/dbRouter'

describe('GTS Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    const gs = useGameStore()
    gs.updateState({
      money: 10000,
      inventory: {},
      box: [],
      claimQueue: []
    })
    
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = vi.fn().mockImplementation(() => {
      const p = Promise.resolve({ data: [], error: null }) as unknown as Promise<{ data: unknown[]; error: null }> & { limit: typeof limitMock }
      p.limit = limitMock
      return p
    })

    interface MockBuilder {
      select: Mock;
      eq: Mock;
      neq: Mock;
      order: Mock;
      single: Mock;
    }
    const builder = {} as unknown as MockBuilder
    builder.select = vi.fn().mockReturnValue(builder)
    builder.eq = vi.fn().mockReturnValue(builder)
    builder.neq = vi.fn().mockReturnValue(builder)
    builder.order = orderMock
    builder.single = vi.fn().mockResolvedValue({ data: { save_data: {} }, error: null })

    gs.db = {
      from: vi.fn().mockReturnValue(builder),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn(),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn()
      })
    } as unknown as DBRouter // Cast here initially to allow mocks, but we will type accesses cleanly
    gs.save = vi.fn().mockResolvedValue({ success: true })
    
    const ui = useUIStore()
    ui.notify = vi.fn()
    ui.setLoading = vi.fn()
    
    const auth = useAuthStore()
    auth.user = { id: 'test_user', user_metadata: { username: 'test_user' } } as unknown as NonNullable<typeof auth.user>
    auth.sessionMode = 'online'
  })

  it('should fetch listings correctly', async () => {
    const gts = useGTSStore()
    const gs = useGameStore()
    
    const mockDb = gs.db as unknown as { from: Mock };
    const limitMock = (mockDb.from() as unknown as {
      select: () => {
        eq: () => {
          order: () => {
            limit: Mock;
          };
        };
      };
    }).select().eq().order().limit;

    limitMock.mockResolvedValue({
      data: [{ id: '1', price: 1000, listing_type: 'item', data: { name: 'Poción' }, status: 'active', seller_id: 'user1', created_at: '' } as MarketListing],
      error: null
    })
    
    await gts.fetchListings()
    expect(gts.listings.length).toBe(1)
    expect(gts.listings[0]!.price).toBe(1000)
  })

  it('should prevent buying if money is insufficient', async () => {
    const gts = useGTSStore()
    const gs = useGameStore()
    gs.state.money = 100
    
    const listing = { id: '1', price: 1000, listing_type: 'item', data: { name: 'Poción' }, status: 'active', seller_id: 'user1', created_at: '' } as MarketListing
    const result = await gts.buyListing(listing)
    
    expect(result).toBe(false)
  })

  it('should call buy_listing_v2 RPC on buy', async () => {
    const gts = useGTSStore()
    const gs = useGameStore()
    gs.state.money = 5000
    
    const rpcMock = gs.db.rpc as Mock;
    rpcMock.mockResolvedValue({ data: { money: 4000 }, error: null })
    
    const updateSpy = vi.spyOn(gs, 'updateState')
    
    const listing = { id: 'listing_123', price: 1000, listing_type: 'item', data: { name: 'Poción' }, status: 'active', seller_id: 'user1', created_at: '' } as MarketListing
    await gts.buyListing(listing)
    
    expect(gs.db.rpc).toHaveBeenCalledWith('buy_listing_v2', { p_listing_id: 'listing_123' })
    expect(updateSpy).toHaveBeenCalledWith({ money: 4000 })
    expect(gs.state.money).toBe(4000)
  })

  it('should filter listings based on mode', () => {
    const gts = useGTSStore()
    gts.listings = [
      { id: '1', listing_type: 'pokemon', data: { name: 'Pikachu', type: 'electric' }, price: 500, status: 'active', seller_id: 'user1', created_at: '' },
      { id: '2', listing_type: 'item', data: { name: 'Poción' }, price: 200, status: 'active', seller_id: 'user2', created_at: '' }
    ] as MarketListing[]
    
    gts.filters.mode = 'pokemon'
    expect(gts.filteredListings.length).toBe(1)
    expect(gts.filteredListings[0]!.data.name).toBe('Pikachu')
    
    gts.filters.mode = 'item'
    expect(gts.filteredListings.length).toBe(1)
    expect(gts.filteredListings[0]!.data.name).toBe('Poción')
  })
})
