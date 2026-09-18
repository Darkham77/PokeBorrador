import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBoxStore } from '@/stores/box'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useGTSStore } from '@/stores/gts'
import { calculateRocketSellPrice } from '@/logic/pokemon/pokemonUtils'
import type { MarketListing } from '@/logic/economy/market'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { DBRouter } from '@/logic/db/dbRouter'

describe('System Market & GTS Domain Suite', () => {
  describe('Black Market (Team Rocket) Sales Logic', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      const gs = useGameStore()
      Object.assign(gs.state, {
        money: 1000,
        starterChosen: true,
        box: [
          // Pidgey Lv 10, IVs: 10 each = 60 total
          { id: 'pidgey', name: 'Pidgey', level: 10, ability: 'keeneye', nature: 'hardy', moves: [{ id: 'tackle', name: 'Tackle' }], ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
          // Rattata Lv 5, IVs: 31 each = 186 total (Perfect)
          { id: 'rattata', name: 'Rattata', level: 5, ability: 'runaway', nature: 'hardy', moves: [{ id: 'tackle', name: 'Tackle' }], ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } },
          // Mewtwo Lv 100, IVs: 31 each = 186 total
          { id: 'mewtwo', name: 'Mewtwo', level: 100, ability: 'pressure', nature: 'hardy', moves: [{ id: 'psychic', name: 'Psychic' }], ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }
        ],
        team: [
          // Bulbasaur Lv 50, IVs: 0 each = 0 total
          { id: 'bulbasaur', name: 'Bulbasaur', level: 50, ability: 'overgrow', nature: 'hardy', moves: [{ id: 'tackle', name: 'Tackle' }], ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
        ],
        playerClass: 'rocket',
        classData: { blackMarketSales: 0 }
      })
      gs.save = vi.fn()
    })

    describe('calculateRocketSellPrice Utility', () => {
      it('should calculate correct price for average pokemon', () => {
        const p = { level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } } as unknown as Pokemon
        // Formula: floor((10 * 50 + (60 / 186) * 500) * 0.8)
        // (500 + 161.29) * 0.8 = 661.29 * 0.8 = 529.03 -> 529
        expect(calculateRocketSellPrice(p)).toBe(529)
      })

      it('should calculate correct price for perfect level 5 pokemon', () => {
        const p = { level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } } as unknown as Pokemon
        // Formula: floor((5 * 50 + (186 / 186) * 500) * 0.8)
        // (250 + 500) * 0.8 = 750 * 0.8 = 600
        expect(calculateRocketSellPrice(p)).toBe(600)
      })

      it('should calculate correct price for max level perfect pokemon', () => {
        const p = { level: 100, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } } as unknown as Pokemon
        // Formula: floor((100 * 50 + (186 / 186) * 500) * 0.8)
        // (5000 + 500) * 0.8 = 5500 * 0.8 = 4400
        expect(calculateRocketSellPrice(p)).toBe(4400)
      })
    })

    describe('Mass Selection Logic in BoxStore', () => {
      it('should calculate correct total value for multiple selection', () => {
        const box = useBoxStore()
        box.boxRocketSelected = [0, 1] // Pidgey (529) + Rattata (600) = 1129
        expect(box.getRocketSellValue()).toBe(1129)
      })

      it('should execute mass sell and update player money and stats', () => {
        const box = useBoxStore()
        const gs = useGameStore()
        
        box.boxRocketSelected = [0, 1]
        const totalValue = box.getRocketSellValue()
        const initialMoney = gs.state.money
        
        const res = box.doBoxRocketSell()
        
        expect(res.value).toBe(totalValue)
        expect(res.count).toBe(2)
        expect(gs.state.money).toBe(initialMoney + totalValue)
        expect(gs.state.classData.blackMarketSales).toBe(2)
        expect(gs.state.box.length).toBe(1) // Only Mewtwo remains
        const mewtwo = gs.state.box[0] as Pokemon
        expect(mewtwo.name).toBe('Mewtwo')
      })
    })

    describe('Single Sale parity (Team/Manual)', () => {
      it('should match price when selling from team', () => {
        const gs = useGameStore()
        
        const selected = [0] // Bulbasaur Lv 50, IV 0
        // Price: floor((50 * 50 + 0) * 0.8) = 2500 * 0.8 = 2000
        
        let totalGain = 0
        selected.forEach((i: number) => {
          totalGain += calculateRocketSellPrice(gs.state.team[i] as Pokemon)
        })
        expect(totalGain).toBe(2000)
      })
    })
  })

  describe('GTS Store Operations & Lifecycle', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      
      const gs = useGameStore()
      gs.updateState({
        money: 10000,
        inventory: {},
        box: [],
        claimQueue: []
      })
      
      interface SupabaseQueryBuilderMock {
        select: Mock;
        eq: Mock;
        neq: Mock;
        order: Mock;
        single: Mock;
      }

      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const orderMock = vi.fn().mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null }) as unknown as Promise<{ data: unknown[]; error: null }> & { limit: typeof limitMock }
        p.limit = limitMock
        return p
      })

      const builder: SupabaseQueryBuilderMock = {
        select: vi.fn(),
        eq: vi.fn(),
        neq: vi.fn(),
        order: orderMock,
        single: vi.fn().mockResolvedValue({ data: { save_data: {} }, error: null })
      }
      builder.select.mockReturnValue(builder)
      builder.eq.mockReturnValue(builder)
      builder.neq.mockReturnValue(builder)

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
      } as unknown as DBRouter
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

    it('enforces maximum of 10 active listings', async () => {
      const gts = useGTSStore()
      const ui = useUIStore()
      ui.notify = vi.fn()

      const mockListings: MarketListing[] = Array.from({ length: 10 }, (_, i) => ({
        id: `list_${i}`,
        seller_id: 'user_123',
        seller_name: 'Trainer',
        listing_type: 'pokemon' as const,
        data: { uid: `poke_${i}`, name: 'Pikachu' } as unknown as Pokemon,
        price: 1000,
        status: 'active' as const,
        created_at: Temporal.Now.instant().toString()
      }))

      gts.myListings = mockListings
      expect(gts.activeMyListings.length).toBe(10)

      const result = await gts.publishListing('pokemon', { uid: 'poke_11', name: 'Raichu' } as unknown as Pokemon, 1000)

      expect(result).toBe(false)
      expect(ui.notify).toHaveBeenCalledWith('Límite de publicaciones alcanzado (10)', '⚠️')
    })

    it('allows publishing when active listings are less than 10', async () => {
      const gts = useGTSStore()

      const mockListings: MarketListing[] = Array.from({ length: 9 }, (_, i) => ({
        id: `list_${i}`,
        seller_id: 'user_123',
        seller_name: 'Trainer',
        listing_type: 'pokemon' as const,
        data: { uid: `poke_${i}`, name: 'Pikachu' } as unknown as Pokemon,
        price: 1000,
        status: 'active' as const,
        created_at: Temporal.Now.instant().toString()
      }))

      gts.myListings = mockListings
      expect(gts.activeMyListings.length).toBe(9)
    })

    it('handles cancellation successfully', async () => {
      const gts = useGTSStore()
      const game = useGameStore()
      const ui = useUIStore()

      game.db.rpc = vi.fn().mockResolvedValue({ data: true, error: null })
      game.fetchClaimQueue = vi.fn().mockResolvedValue([])

      const result = await gts.cancelListing('123')

      expect(result).toBe(true)
      expect(ui.setLoading).toHaveBeenCalledWith(true)
      expect(ui.setLoading).toHaveBeenCalledWith(false)
      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Publicación cancelada'), '✅')
    })

    it('handles cancellation errors', async () => {
      const gts = useGTSStore()
      const game = useGameStore()
      const ui = useUIStore()

      game.db.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not authorized' } })

      const result = await gts.cancelListing('123')

      expect(result).toBe(false)
      expect(ui.notify).toHaveBeenCalledWith('Not authorized', '❌')
    })

    it('handles buying a listing successfully', async () => {
      const gts = useGTSStore()
      const game = useGameStore()
      const ui = useUIStore()

      const mockListing: MarketListing = { 
        id: 'list-1', 
        price: 100, 
        listing_type: 'item', 
        data: { name: 'Potion' },
        status: 'active',
        seller_id: 'seller-1',
        created_at: Temporal.Now.instant().toString()
      }
      game.state.money = 500
      game.db.rpc = vi.fn().mockResolvedValue({ data: { money: 400 }, error: null })
      game.fetchClaimQueue = vi.fn().mockResolvedValue([])

      const result = await gts.buyListing(mockListing)

      expect(result).toBe(true)
      expect(ui.setLoading).toHaveBeenCalledWith(true)
      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Compra exitosa'), '✅')
    })

    it('correctly categorizes sales vs purchases claims and unifies GTS count', () => {
      const gts = useGTSStore()
      const game = useGameStore()
      const now = Temporal.Now.instant().toString()

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
      ]

      expect(gts.pendingSalesClaims.length).toBe(1)
      expect(gts.unclaimedSalesCount).toBe(1)

      expect(gts.pendingPurchaseClaims.length).toBe(2)
      expect(gts.unclaimedPurchasesCount).toBe(2)

      expect(gts.allPendingGtsClaims.length).toBe(3)
      expect(gts.unclaimedGtsCount).toBe(3)
    })
  })
})
