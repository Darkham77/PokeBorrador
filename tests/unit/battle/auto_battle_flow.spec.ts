/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import { startEncounter, handleBattleFlowCompletion } from '@/logic/battle/searchLoop'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/encounters/encounters', () => ({
  generateEncounter: vi.fn(async () => ({
    type: 'wild',
    pokemon: { id: 'pidgey', name: 'Pidgey', hp: 50, maxHp: 50, uid: 'pidgey-1', moves: [{ id: 'tackle', name: 'Placaje', pp: 35 }] }
  }))
}))

describe('Auto-Battle Flow Unit Tests', () => {
  let mockCtx: BattleContext

  beforeEach(() => {
    setActivePinia(createPinia())

    const currentState = ref<string>(BATTLE_STATES.SEARCH_PHASE)
    const currentSubState = ref<string | null>(BATTLE_SUBSTATES.COMBAT_OR_FLEE)

    const playerMon = {
      uid: 'charizard-1',
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'flamethrower', name: 'Lanzallamas', pp: 15 }]
    } as unknown as Pokemon

    const enemyMon = {
      uid: 'rattata-1',
      name: 'Rattata',
      hp: 40,
      maxHp: 40,
      moves: [{ id: 'tackle', name: 'Placaje', pp: 35 }]
    } as unknown as Pokemon

    mockCtx = {
      activeBattle: ref({
        locationId: 'route1',
        _initialEnemy: enemyMon,
        enemy: enemyMon,
        player: playerMon,
        isTrainer: false,
        isGym: false,
        over: false,
        wasSearching: true,
        rewardsProcessed: false,
        _rewardCombatants: []
      }),
      debugLoopPokemon: ref(null),
      isProcessing: ref(false),
      isIntroAnimating: ref(false),
      isSearching: ref(true),
      isBattleActive: ref(true),
      isFinishing: ref(false),
      isReadyToExit: ref(false),
      faintedSides: ref(new Set<string>()),
      gs: {
        state: {
          team: [playerMon],
          map: { currentMap: 'route1' }
        },
        save: vi.fn(async () => {})
      },
      fsm: {
        currentState,
        currentSubState,
        transition: vi.fn(async (s: string, sub: string | null = null) => {
          currentState.value = s
          currentSubState.value = sub
        })
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      clearLogs: vi.fn(),
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn(),
      persistBattle: vi.fn(),
      initBattle: vi.fn(async () => {
        currentState.value = BATTLE_STATES.ACTIVE_BATTLE
        currentSubState.value = BATTLE_SUBSTATES.WAIT_INPUT
      })
    } as unknown as BattleContext
  })

  it('should cleanly start encounter from COMBAT_OR_FLEE when called', async () => {
    expect(mockCtx.fsm.currentState.value).toBe(BATTLE_STATES.SEARCH_PHASE)
    expect(mockCtx.fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.COMBAT_OR_FLEE)

    await startEncounter(mockCtx)

    expect(mockCtx.initBattle).toHaveBeenCalled()
    expect(mockCtx.isProcessing.value).toBe(false)
    expect(mockCtx.isIntroAnimating.value).toBe(false)
  })

  it('should ignore redundant startEncounter if isProcessing is already true (no race condition / crash)', async () => {
    mockCtx.isProcessing.value = true

    // When isProcessing is true, startEncounter should safely return without throwing
    await expect(startEncounter(mockCtx)).resolves.toBeUndefined()
    expect(mockCtx.initBattle).not.toHaveBeenCalled()
  })

  it('should ignore stale startEncounter without throwing if FSM has already advanced past SEARCH_PHASE', async () => {
    mockCtx.fsm.currentState.value = BATTLE_STATES.FIRST_INTRO
    mockCtx.fsm.currentSubState.value = BATTLE_SUBSTATES.WILD_ENCOUNTER

    // Even if called late, it should not throw unhandled exception
    await expect(startEncounter(mockCtx)).resolves.toBeUndefined()
    expect(mockCtx.initBattle).not.toHaveBeenCalled()
  })

  it('should complete search flow and stop in stable COMBAT_OR_FLEE state without crashing', async () => {
    await handleBattleFlowCompletion(mockCtx, 'search')

    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
    expect(mockCtx.isProcessing.value).toBe(false)
  })
})
