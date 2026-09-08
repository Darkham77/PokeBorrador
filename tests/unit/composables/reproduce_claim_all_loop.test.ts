// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { simulatePastEventAndMissionsReward } from '@/logic/debug/rewardsDebugSimulation'
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { useGTSStore } from '@/stores/gts'
import { usePvPStore } from '@/stores/pvp'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { AuthUser } from '@/types/auth/auth'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('reproduce claim all rewards bug', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reproduces claiming all rewards after debug simulation', async () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const modalStore = useModalStore()
    const gtsStore = useGTSStore()
    const pvpStore = usePvPStore()

    authStore.user = { id: 'local_user', user_metadata: { username: 'Franco' } } as AuthUser
    gameStore.state.starterChosen = true
    gameStore.state.trainer = 'Franco'
    const poke = makePokemon('pikachu', 25)!
    gameStore.state.team = [poke]

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
      } as unknown as GameEvent
    ]

    await simulatePastEventAndMissionsReward(eventStore, gameStore, authStore, uiStore, modalStore, gtsStore, pvpStore)

    const { unifiedRewards, totalClaimableRewards, claimAllRewards } = useUnifiedRewards()

    console.log('Total claimable before:', totalClaimableRewards.value)
    console.log('Claimable list:', unifiedRewards.value.map(r => ({ id: r.id, source: r.source, claimable: r.isClaimable })))

    const saveSpy = vi.spyOn(gameStore, 'save')
    const saveGameSpy = vi.spyOn(gameStore, 'saveGame')

    const claimed = await claimAllRewards()
    console.log('Claimed count:', claimed)
    console.log('save calls count:', saveSpy.mock.calls.length)
    console.log('saveGame calls count:', saveGameSpy.mock.calls.length)
    console.log('Total claimable after:', totalClaimableRewards.value)

    // A bulk claim should execute claims without triggering an individual full save per item,
    // and instead perform at most 1 consolidated atomic save at the end.
    expect(saveSpy.mock.calls.length + saveGameSpy.mock.calls.length).toBeLessThanOrEqual(1)
    expect(totalClaimableRewards.value).toBe(0)
  }, 5000)
})
