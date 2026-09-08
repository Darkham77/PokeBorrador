// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import { useEventStore } from '@/stores/events'
import { usePvPStore } from '@/stores/pvp'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { useGTSStore } from '@/stores/gts'

describe('useUnifiedRewards composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('aggregates rewards from events, ranked milestones, class missions, and GTS claim queue', () => {
    const eventStore = useEventStore()
    const pvpStore = usePvPStore()
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()
    const breedingStore = useBreedingStore()

    // 1. Mock Event Award
    eventStore.pendingAwards = [
      {
        id: 'award-1',
        event_id: 'ev-test',
        winner_id: 'user-1',
        prize: JSON.stringify({ money: 1000 }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      }
    ]
    eventStore.allEvents = [
      {
        id: 'ev-test',
        name: 'Torneo Kanto',
        start_at: '2026-09-01T00:00:00Z',
        end_at: '2026-09-30T00:00:00Z',
        active: true,
        config: {
          prize: { money: 1000 }
        }
      } as any
    ]

    // 2. Mock Ranked Milestones
    pvpStore.maxElo = 1300
    pvpStore.rewardsClaimed = []

    // 3. Mock Class Mission Done
    gameStore.state.classData = {
      ...(gameStore.state.classData || {}),
      activeMission: {
        id: 'mission_6h',
        startedAt: Date.now() - 4000000,
        endsAt: Date.now() - 1000,
        projectedReward: 500
      }
    }
    expect(classStore.isMissionDone).toBe(true)

    // 4. Mock GTS Claim
    gameStore.state.claimQueue = [
      {
        id: 'claim-1',
        user_id: 'user-1',
        source_type: 'gts',
        asset_data: { type: 'money', data: 5000 },
        created_at: '2026-09-01T00:00:00Z'
      } as any
    ]

    // 5. Mock Breeding Daycare Missions (None actionable)
    breedingStore.dailyMissions = []

    const {
      unifiedRewards,
      totalClaimableRewards,
      totalHomeNotifications
    } = useUnifiedRewards()

    expect(unifiedRewards.value.length).toBeGreaterThanOrEqual(4)
    expect(totalClaimableRewards.value).toBeGreaterThanOrEqual(4)
    expect(totalHomeNotifications.value).toBe(totalClaimableRewards.value)

    const eventItem = unifiedRewards.value.find(r => r.source === 'event')
    expect(eventItem).toBeDefined()
    expect(eventItem?.isClaimable).toBe(true)
    expect(eventItem?.pills.length).toBeGreaterThan(0)
    expect(eventItem?.pills[0]?.colorClass).toBe('money')
    expect(eventItem?.pills[0]?.label).toContain('1.000')

    const rankedItem = unifiedRewards.value.find(r => r.source === 'ranked_milestone')
    expect(rankedItem).toBeDefined()
    expect(rankedItem?.pills.length).toBeGreaterThan(0)
    expect(rankedItem?.pills[0]?.spriteUrl).toBeDefined()
    expect(rankedItem?.pills[0]?.qtyText).toMatch(/^x\d+$/)

    const classItem = unifiedRewards.value.find(r => r.source === 'class_mission')
    expect(classItem).toBeDefined()
    expect(classItem?.pills.length).toBeGreaterThan(0)

    const gtsItem = unifiedRewards.value.find(r => r.source === 'gts_claim')
    expect(gtsItem).toBeDefined()
    expect(gtsItem?.pills.length).toBeGreaterThan(0)
    expect(gtsItem?.pills[0]?.colorClass).toBe('money')
  })

  it('delegates claimReward to the corresponding domain store', async () => {
    const eventStore = useEventStore()
    const pvpStore = usePvPStore()
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    eventStore.claimAward = vi.fn().mockResolvedValue('ok')
    pvpStore.claimReward = vi.fn().mockResolvedValue(true)
    classStore.collectMission = vi.fn()
    gameStore.claimAsset = vi.fn().mockResolvedValue(true)

    const { claimReward } = useUnifiedRewards()

    const eventItem = {
      id: 'event-1',
      source: 'event' as const,
      title: 'Torneo',
      isClaimable: true,
      prize: {},
      pills: [],
      rawData: { id: 'raw-event-1' }
    }
    await claimReward(eventItem)
    expect(eventStore.claimAward).toHaveBeenCalledWith('raw-event-1', { autoSave: true, silent: false })

    const rankedItem = {
      id: 'milestone-1',
      source: 'ranked_milestone' as const,
      title: 'Hito Ranked',
      isClaimable: true,
      prize: {},
      pills: [],
      rawData: 'bronce_1000'
    }
    await claimReward(rankedItem)
    expect(pvpStore.claimReward).toHaveBeenCalledWith('bronce_1000', { autoSave: true, silent: false })

    const classItem = {
      id: 'class-1',
      source: 'class_mission' as const,
      title: 'Misión Clase',
      isClaimable: true,
      prize: {},
      pills: [],
      rawData: 'cm-1'
    }
    await claimReward(classItem)
    expect(classStore.collectMission).toHaveBeenCalledWith({ autoSave: true, silent: false })

    const gtsItem = {
      id: 'gts-1',
      source: 'gts_claim' as const,
      title: 'Venta',
      isClaimable: true,
      prize: {},
      pills: [],
      rawData: 'claim-abc'
    }
    await claimReward(gtsItem)
    expect(gameStore.claimAsset).toHaveBeenCalledWith('claim-abc')
  })

  it('claimAllRewards iterates over all claimable rewards', async () => {
    const eventStore = useEventStore()
    const pvpStore = usePvPStore()
    pvpStore.maxElo = 0
    eventStore.claimAward = vi.fn().mockResolvedValue('ok')
    eventStore.pendingAwards = [
      {
        id: 'award-1',
        event_id: 'ev-test',
        winner_id: 'user-1',
        prize: JSON.stringify({ money: 1000 }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      }
    ]
    eventStore.allEvents = [
      {
        id: 'ev-test',
        name: 'Ev',
        active: true,
        config: {
          prize: { money: 1000 }
        }
      } as any
    ]

    const { claimAllRewards } = useUnifiedRewards()
    const claimedCount = await claimAllRewards()

    expect(claimedCount).toBe(1)
    expect(eventStore.claimAward).toHaveBeenCalledWith('award-1', { autoSave: false, silent: true })
  })

  it('clarifies GTS sales with sold item or pokemon details and formats ranked season awards', () => {
    const gameStore = useGameStore()
    const gtsStore = useGTSStore()
    const eventStore = useEventStore()

    // 1. Mock GTS claim with sold item
    gtsStore.salesHistory = [
      {
        id: 'listing-nugget',
        listing_type: 'item',
        data: { name: 'nugget', qty: 1 },
        price: 15000,
        status: 'sold'
      } as any,
      {
        id: 'listing-pikachu',
        listing_type: 'pokemon',
        data: { name: 'Pikachu', level: 25, isShiny: true },
        price: 50000,
        status: 'sold'
      } as any
    ]

    gameStore.state.claimQueue = [
      {
        id: 'claim-item-sale',
        user_id: 'user-1',
        asset_data: { type: 'money', data: 15000, sold_item: { name: 'nugget', qty: 1 } },
        source_type: 'gts',
        source_id: 'listing-nugget',
        created_at: '2026-09-01T00:00:00Z'
      } as any,
      {
        id: 'claim-poke-sale',
        user_id: 'user-1',
        asset_data: { type: 'money', data: 50000 },
        source_type: 'gts',
        source_id: 'listing-pikachu',
        created_at: '2026-09-01T00:00:00Z'
      } as any
    ]

    // 2. Mock Ranked Season Award in awards
    eventStore.pendingAwards = [
      {
        id: 'season-award-1',
        event_id: 'ranked_season_Temporada 1',
        winner_id: 'user-1',
        prize: JSON.stringify({ type: 'ranked_medal', tier: 'plata', season: 'Temporada 1' }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      }
    ]

    const { unifiedRewards } = useUnifiedRewards()

    const itemSaleReward = unifiedRewards.value.find(r => r.id === 'gts-claim-item-sale')
    expect(itemSaleReward).toBeDefined()
    expect(itemSaleReward?.title).toBe('Venta de Ítems por GTS')
    expect(itemSaleReward?.subtitle).toBe('Transacción en el Mercado Global')
    expect(itemSaleReward?.categoryBadge?.name).toBe('Objeto')
    expect(itemSaleReward?.pills.length).toBeGreaterThanOrEqual(1)
    expect(itemSaleReward?.pills.some(p => p.colorClass === 'money')).toBe(true)

    const pokeSaleReward = unifiedRewards.value.find(r => r.id === 'gts-claim-poke-sale')
    expect(pokeSaleReward).toBeDefined()
    expect(pokeSaleReward?.title).toBe('Venta de Pokémon por GTS')
    expect(pokeSaleReward?.subtitle).toBe('Transacción en el Mercado Global')
    expect(pokeSaleReward?.categoryBadge?.name).toBe('Pokémon')
    expect(pokeSaleReward?.pills.length).toBeGreaterThanOrEqual(1)
    expect(pokeSaleReward?.pills.some(p => p.colorClass === 'money')).toBe(true)

    const seasonReward = unifiedRewards.value.find(r => r.id === 'event-season-award-1')
    expect(seasonReward).toBeDefined()
    expect(seasonReward?.title).toBe('Premios de Temporada: TEMPORADA 1')
    expect(seasonReward?.categoryBadge?.name).toBe('Temporada Ranked')
    expect(seasonReward?.pills.some(p => p.colorClass === 'special' && p.icon === '🎖️')).toBe(true)
  })
})
