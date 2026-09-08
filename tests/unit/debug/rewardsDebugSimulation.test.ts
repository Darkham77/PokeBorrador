// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  findLatestPastEvent,
  simulatePastEventAndMissionsReward,
  clearDebugSimulatedRewards
} from '@/logic/debug/rewardsDebugSimulation'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { useGTSStore } from '@/stores/gts'
import { usePvPStore } from '@/stores/pvp'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('rewardsDebugSimulation logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('findLatestPastEvent selects the most recently finished event with configured prizes', () => {
    const nowZdt = Temporal.Now.zonedDateTimeISO('America/Argentina/Buenos_Aires')

    const events: GameEvent[] = [
      {
        id: 'future-event',
        name: 'Torneo Futuro',
        active: true,
        description: 'Evento futuro',
        start_at: nowZdt.add({ hours: 5 }).toInstant().toString(),
        end_at: nowZdt.add({ hours: 10 }).toInstant().toString(),
        config: {
          prizes: {
            first: { money: 5000 }
          }
        }
      },
      {
        id: 'older-past-event',
        name: 'Torneo Pasado Antiguo',
        active: true,
        description: 'Evento pasado antiguo',
        start_at: nowZdt.subtract({ days: 10 }).toInstant().toString(),
        end_at: nowZdt.subtract({ days: 9 }).toInstant().toString(),
        config: {
          prizes: {
            first: { money: 1000 }
          }
        }
      },
      {
        id: 'recent-past-event',
        name: 'Torneo Pasado Reciente',
        active: true,
        description: 'Evento finalizado hace 2 horas',
        start_at: nowZdt.subtract({ hours: 5 }).toInstant().toString(),
        end_at: nowZdt.subtract({ hours: 2 }).toInstant().toString(),
        config: {
          prizes: {
            first: { money: 10000 },
            second: { money: 5000 },
            third: { money: 2000 }
          }
        }
      },
      {
        id: 'no-prize-event',
        name: 'Evento sin premios',
        active: true,
        description: 'Finalizado pero sin premios configurados',
        start_at: nowZdt.subtract({ hours: 2 }).toInstant().toString(),
        end_at: nowZdt.subtract({ hours: 1 }).toInstant().toString(),
        config: {}
      }
    ]

    const result = findLatestPastEvent(events, nowZdt)
    expect(result).toBeDefined()
    expect(result?.event.id).toBe('recent-past-event')
    expect(result?.endedAt).toBeDefined()
  })

  it('simulatePastEventAndMissionsReward injects valid event award, finished class mission, GTS claim, and redirects', async () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const modalStore = useModalStore()

    authStore.user = { id: 'tester-1' } as any
    gameStore.state.starterChosen = true
    gameStore.state.trainer = 'Tester'
    gameStore.state.team = [
      {
        uid: 'poke-valid-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 25,
        exp: 1000,
        expNeeded: 2000,
        hp: 60,
        maxHp: 60,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        type: 'electric',
        isShiny: false,
        friendship: 70,
        nature: 'hardy',
        gender: 'm',
        status: '',
        ability: 'static',
        vigor: 100,
        maxVigor: 100,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: [{ id: 'thunderbolt', name: 'Rayos', type: 'electric', power: 90, pp: 15, maxPP: 15 }]
      } as any
    ]

    const nowInstant = Temporal.Now.instant()
    eventStore.allEvents = [
      {
        id: 'gran_concurso_sabado',
        name: 'Gran Concurso de Sábado',
        active: true,
        description: 'Concurso semanal',
        start_at: nowInstant.subtract({ hours: 10 }).toString(),
        end_at: nowInstant.subtract({ hours: 2 }).toString(),
        config: {
          prizes: {
            first: { money: 20000 },
            second: { money: 10000 },
            third: { money: 5000 }
          }
        }
      } as any
    ]

    const gtsStore = useGTSStore()
    const pvpStore = usePvPStore()
    const summary = await simulatePastEventAndMissionsReward(eventStore, gameStore, authStore, uiStore, modalStore, gtsStore, pvpStore)

    expect(summary).toContain('Gran Concurso de Sábado')

    // 1. Verify Event Award is claimable
    expect(eventStore.pendingAwards.length).toBeGreaterThanOrEqual(1)
    const injectedAward = eventStore.pendingAwards.find(a => a.id.startsWith('test_award_'))
    expect(injectedAward).toBeDefined()
    expect(isAwardClaimable(injectedAward, eventStore.allEvents)).toBe(true)

    // 2. Verify Class Mission is completed and ready
    const mission = (gameStore.state.classData as { activeMission?: { id?: string; endsAt?: number } } | undefined)?.activeMission
    expect(mission).toBeDefined()
    expect(mission?.id).toBe('mission_6h')
    expect(Temporal.Now.instant().epochMilliseconds).toBeGreaterThanOrEqual(mission?.endsAt || 0)

    // 3. Verify GTS Claim is queued with sold_item metadata
    const gtsClaim = (gameStore.state.claimQueue || []).find(c => String(c.id).startsWith('test_claim_'))
    expect(gtsClaim).toBeDefined()
    expect((gtsClaim?.asset_data as any)?.sold_item?.name).toBe('nugget')

    // 3b. Verify GTS fake sold listing is in salesHistory
    const gtsSale = (gtsStore.salesHistory || []).find(s => (s.data as any)?.name === 'nugget')
    expect(gtsSale).toBeDefined()
    expect(gtsSale?.status).toBe('sold')

    // 3c. Verify GTS Claim can be claimed via gameStore.claimAsset
    const initialMoney = gameStore.state.money || 0
    const claimSuccess = await gameStore.claimAsset(gtsClaim!.id)
    expect(claimSuccess).toBe(true)
    expect(gameStore.state.money).toBe(initialMoney + 15000)

    // 4. Verify Coliseo Ranked milestones and season award simulation
    expect(pvpStore.maxElo).toBe(1400)
    expect(gameStore.state.rankedMaxElo).toBe(1400)
    expect(pvpStore.rewardsClaimed).not.toContain('plata_1400')
    const seasonAward = eventStore.pendingAwards.find(a => a.id.startsWith('test_ranked_award_'))
    expect(seasonAward).toBeDefined()
    expect(isAwardClaimable(seasonAward, eventStore.allEvents)).toBe(true)

    // 4b. Verify season award can be claimed cleanly
    const claimRes = await eventStore.claimAward(seasonAward!.id)
    expect(claimRes).toBe('claimed')
    expect(eventStore.pendingAwards.find(a => a.id === seasonAward!.id)).toBeUndefined()

    // 5. Verify navigation redirection
    expect(uiStore.activeTab).toBe('home')
  })

  it('clearDebugSimulatedRewards removes only simulated test entities', async () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const uiStore = useUIStore()

    eventStore.pendingAwards = [
      {
        id: 'real_award_1',
        event_id: 'real-ev',
        winner_id: 'user',
        prize: JSON.stringify({ money: 100 }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      },
      {
        id: 'test_award_123',
        event_id: 'ev',
        winner_id: 'user',
        prize: JSON.stringify({ money: 100 }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      },
      {
        id: 'test_ranked_award_456',
        event_id: 'ranked_season_Temporada 1',
        winner_id: 'user',
        prize: JSON.stringify({ type: 'ranked_medal', tier: 'plata' }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      }
    ]

    gameStore.state.classData = {
      ...(gameStore.state.classData || {}),
      activeMission: {
        id: 'mission_6h',
        startedAt: Date.now() - 4000000,
        endsAt: Date.now() - 1000
      }
    } as any

    gameStore.state.claimQueue = [
      {
        id: 'real_claim',
        user_id: 'user',
        asset_data: { type: 'money', data: 50 },
        source_type: 'gts',
        created_at: '2026-09-01T00:00:00Z'
      } as any,
      {
        id: 'test_claim_456',
        user_id: 'user',
        asset_data: { type: 'money', data: 50 },
        source_type: 'gts',
        created_at: '2026-09-01T00:00:00Z'
      } as any
    ]

    const gtsStore = useGTSStore()
    gtsStore.salesHistory = [
      { id: 'real_sale', status: 'sold', price: 100, data: { name: 'potion' } } as any,
      { id: 'test_listing_789', status: 'sold', price: 15000, data: { name: 'nugget' } } as any
    ]

    const pvpStore = usePvPStore()
    pvpStore.maxElo = 1400
    gameStore.state.rankedMaxElo = 1400

    await clearDebugSimulatedRewards(eventStore, gameStore, uiStore, gtsStore, pvpStore)

    // Only real_award preserved
    expect(eventStore.pendingAwards.length).toBe(1)
    expect(eventStore.pendingAwards[0]?.id).toBe('real_award_1')

    // Test mission cleared
    expect(gameStore.state.classData?.activeMission).toBeNull()

    // Only real claim preserved
    expect(gameStore.state.claimQueue?.length).toBe(1)
    expect(gameStore.state.claimQueue?.[0]?.id).toBe('real_claim')

    // Only real sale preserved
    expect(gtsStore.salesHistory.length).toBe(1)
    expect(gtsStore.salesHistory[0]?.id).toBe('real_sale')

    // Coliseo Ranked reset
    expect(pvpStore.maxElo).toBe(1000)
    expect(gameStore.state.rankedMaxElo).toBe(1000)
  })

  it('claimAllRewards claims all claimable items and leaves only non-claimable archived rewards', async () => {
    const { useUnifiedRewards } = await import('@/composables/rewards/useUnifiedRewards')
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const modalStore = useModalStore()
    const gtsStore = useGTSStore()
    const pvpStore = usePvPStore()

    // Setup valid player state for save safety
    authStore.user = { id: 'tester-1' } as any
    gameStore.state.starterChosen = true
    gameStore.state.trainer = 'Tester'
    gameStore.state.team = [
      {
        uid: 'poke-valid-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 25,
        exp: 1000,
        expNeeded: 2000,
        hp: 60,
        maxHp: 60,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        type: 'electric',
        isShiny: false,
        friendship: 70,
        nature: 'hardy',
        gender: 'm',
        status: '',
        ability: 'static',
        vigor: 100,
        maxVigor: 100,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: [{ id: 'thunderbolt', name: 'Rayos', type: 'electric', power: 90, pp: 15, maxPP: 15 }]
      } as any
    ]
    await gameStore.save(false)

    // 1. Simulate all rewards (including GTS item, GTS pokemon, and archived legacy award)
    await simulatePastEventAndMissionsReward(eventStore, gameStore, authStore, uiStore, modalStore, gtsStore, pvpStore)

    const { unifiedRewards, claimAllRewards, totalClaimableRewards } = useUnifiedRewards()

    // Ensure we have claimable rewards (Event award, Ranked Milestones, Class Mission, GTS sale, GTS pokemon)
    expect(totalClaimableRewards.value).toBeGreaterThanOrEqual(5)

    // Ensure archived award is present but NOT claimable
    const archivedReward = unifiedRewards.value.find(r => r.rawData && typeof r.rawData === 'object' && 'event_id' in r.rawData && (r.rawData as any).event_id === 'legacy_archived_tournament_2024')
    expect(archivedReward).toBeDefined()
    expect(archivedReward?.isClaimable).toBe(false)

    // 2. Click "Reclamar Todo"
    const claimedCount = await claimAllRewards()
    expect(claimedCount).toBeGreaterThanOrEqual(5)

    // After claimAllRewards, NO claimable rewards should remain
    const remainingClaimable = unifiedRewards.value.filter(r => r.isClaimable)
    expect(remainingClaimable.length).toBe(0)

    // The ONLY reward remaining in the entire list must be the unclaimable archived award
    expect(unifiedRewards.value.length).toBe(1)
    expect(unifiedRewards.value[0]?.id).toBe(archivedReward?.id)

    // 3. Verify the Pokémon from GTS was transferred into the player's team or box with valid capture timestamp
    const simulatedEevee = [...gameStore.state.team, ...(gameStore.state.box || [])].find(p => p?.species === 'eevee')
    expect(simulatedEevee).toBeDefined()
    expect(simulatedEevee?.obtainedAt).toBeGreaterThan(0)
    expect(simulatedEevee?.obtainedMethod).toBe('reward')

    // 4. Simulate page reload (F5):
    // In memory, state.rankedRewardsClaimed has the milestones.
    // pvpStore must stay in sync with gameStore.state.rankedRewardsClaimed
    expect(pvpStore.rewardsClaimed).toContain('plata_1400')
    expect(gameStore.state.rankedRewardsClaimed).toContain('plata_1400')

    // On F5, if pvpStore re-syncs, unifiedRewards must have 0 claimable ranked milestones
    const reloadedUnified = useUnifiedRewards()
    const reloadedRankedItems = reloadedUnified.unifiedRewards.value.filter(r => r.source === 'ranked_milestone')
    expect(reloadedRankedItems.length).toBe(0)

    // 5. Test that the archived award can be discarded with discardAward
    const discardRes = await eventStore.discardAward((archivedReward!.rawData as any).id)
    expect(discardRes).toBe(true)
    expect(unifiedRewards.value.length).toBe(0)
  })
})
