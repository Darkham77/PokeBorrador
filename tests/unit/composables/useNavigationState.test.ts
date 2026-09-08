// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNavigationState } from '@/composables/navigation/useNavigationState'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { usePvPStore } from '@/stores/pvp'

describe('useNavigationState homeTooltipDescription', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('provides default message when there are 0 home notifications', () => {
    const pvpStore = usePvPStore()
    pvpStore.maxElo = 0
    pvpStore.rewardsClaimed = []

    const { homeTooltipDescription, totalHomeNotifications } = useNavigationState()
    expect(totalHomeNotifications.value).toBe(0)
    expect(homeTooltipDescription.value).toContain('Panel central con eventos mundiales')
    expect(homeTooltipDescription.value).toContain('Haz clic para ir a Inicio.')
  })

  it('formats exact breakdown of rewards, GTS sales, and actionable missions', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const pvpStore = usePvPStore()
    const breedingStore = useBreedingStore()

    // 1. Mock 1 Event Award
    eventStore.pendingAwards = [
      {
        id: 'test-award-1',
        event_id: 'ev-1',
        winner_id: 'user-1',
        prize: JSON.stringify({ money: 1000 }),
        received_at: null,
        awarded_at: '2026-09-01T00:00:00Z'
      }
    ]
    eventStore.allEvents = [
      {
        id: 'ev-1',
        name: 'Torneo Kanto',
        start_at: '2026-09-01T00:00:00Z',
        end_at: '2026-09-30T00:00:00Z',
        active: true,
        config: { prize: { money: 1000 } }
      } as any
    ]

    // 2. Mock 1 Ranked Milestone (1000 ELO only)
    pvpStore.maxElo = 1000
    pvpStore.rewardsClaimed = []

    // 3. Mock 1 GTS sale claim
    gameStore.state.claimQueue = [
      {
        id: 'claim-1',
        user_id: 'user-1',
        source_type: 'gts',
        asset_data: {
          type: 'money',
          data: 15000,
          sold_item: { name: 'nugget', qty: 1 }
        },
        source_id: 'listing-1',
        created_at: '2026-09-01T00:00:00Z'
      } as any
    ]

    // 4. Mock 1 Daycare mission ready to turn in
    gameStore.state.starterChosen = true
    gameStore.state.team = [
      {
        uid: 'p1',
        id: 'pidgey',
        species: 'pidgey',
        level: 15,
        onMission: false,
        inDaycare: false,
        onDefense: false,
        isIllegal: false
      } as any
    ]
    breedingStore.dailyMissions = [
      {
        date: '2026-09-01',
        targetId: 'pidgey',
        requirement: { type: 'level', minLevel: 10 },
        reqText: 'Pidgey nivel 10+',
        reward: {
          id: 'pokeball',
          name: 'Poké Ball',
          qty: 5,
          icon: '🔴'
        },
        completed: false,
        trainerType: 'Ornitólogo',
        trainerSprite: 'birdkeeper',
        trainerName: 'Luis',
        dialogue: 'Necesito un Pidgey'
      } as any
    ]

    const { homeTooltipDescription, totalHomeNotifications } = useNavigationState()

    // 1 event + 1 ranked milestone + 1 gts sale + 1 daycare mission = 4 total
    expect(totalHomeNotifications.value).toBe(4)
    expect(homeTooltipDescription.value).toContain('Novedades pendientes (4):')
    expect(homeTooltipDescription.value).toContain('• 2 recompensas') // 1 event + 1 ranked milestone
    expect(homeTooltipDescription.value).toContain('• 1 venta en GTS')
    expect(homeTooltipDescription.value).toContain('• 1 misión diaria para entregar')
    expect(homeTooltipDescription.value).toContain('Haz clic para ir a Inicio.')
  })

  it('includes ready-to-hatch eggs in totalHomeNotifications and homeTooltipDescription', () => {
    const gameStore = useGameStore()
    const pvpStore = usePvPStore()
    pvpStore.maxElo = 0
    pvpStore.rewardsClaimed = []

    gameStore.state.eggs = [
      { id: 'egg-1', species: 'pichu', steps: 0, ready: true, totalSteps: 1000 } as any,
      { id: 'egg-2', species: 'cleffa', steps: 0, ready: false, totalSteps: 1000 } as any,
      { id: 'egg-3', species: 'magby', steps: 500, ready: false, totalSteps: 1000 } as any
    ]

    const { homeTooltipDescription, totalHomeNotifications } = useNavigationState()

    expect(totalHomeNotifications.value).toBe(2)
    expect(homeTooltipDescription.value).toContain('Novedades pendientes (2):')
    expect(homeTooltipDescription.value).toContain('• 2 huevos listos para eclosionar')
  })

  it('correctly categorizes legacy discardable rewards and GTS purchases with mathematical sum parity', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const pvpStore = usePvPStore()

    pvpStore.maxElo = 0
    pvpStore.rewardsClaimed = []

    // 4 claimable events + 1 legacy event (active: false)
    eventStore.allEvents = [
      {
        id: 'ev-active',
        name: 'Torneo Activo',
        active: true,
        start_at: '2026-09-01T00:00:00Z',
        end_at: '2026-09-30T00:00:00Z',
        config: { prize: { money: 100 } }
      } as any,
      {
        id: 'ev-expired',
        name: 'Torneo Antiguo',
        active: false,
        start_at: '2026-01-01T00:00:00Z',
        end_at: '2026-01-10T00:00:00Z'
      } as any
    ]
    eventStore.pendingAwards = [
      { id: 'aw-1', event_id: 'ev-active', prize: JSON.stringify({ money: 100 }), awarded_at: '2026-09-02T00:00:00Z' } as any,
      { id: 'aw-2', event_id: 'ev-active', prize: JSON.stringify({ money: 100 }), awarded_at: '2026-09-02T00:00:00Z' } as any,
      { id: 'aw-3', event_id: 'ev-active', prize: JSON.stringify({ money: 100 }), awarded_at: '2026-09-02T00:00:00Z' } as any,
      { id: 'aw-4', event_id: 'ev-active', prize: JSON.stringify({ money: 100 }), awarded_at: '2026-09-02T00:00:00Z' } as any,
      { id: 'aw-legacy', event_id: 'ev-expired', prize: JSON.stringify({ money: 100 }), awarded_at: '2026-01-05T00:00:00Z' } as any
    ]

    // 1 GTS sale + 1 GTS purchase
    gameStore.state.claimQueue = [
      {
        id: 'claim-sale',
        user_id: 'user-1',
        source_type: 'gts',
        asset_data: { type: 'money', data: 5000, sold_item: { name: 'nugget', qty: 1 } },
        source_id: 's-1'
      } as any,
      {
        id: 'claim-purchase',
        user_id: 'user-1',
        source_type: 'gts',
        asset_data: { type: 'pokemon', data: { name: 'rattata', level: 3 } },
        source_id: 'p-1'
      } as any
    ]

    const { homeTooltipDescription, totalHomeNotifications } = useNavigationState()

    // 4 claimable + 1 legacy + 1 sale + 1 purchase = 7 (assuming no class deploy)
    expect(totalHomeNotifications.value).toBe(7)
    expect(homeTooltipDescription.value).toContain('Novedades pendientes (7):')
    expect(homeTooltipDescription.value).toContain('• 4 recompensas')
    expect(homeTooltipDescription.value).toContain('• 1 recompensa para descartar')
    expect(homeTooltipDescription.value).toContain('• 1 venta en GTS')
    expect(homeTooltipDescription.value).toContain('• 1 compra en GTS')
  })
})
