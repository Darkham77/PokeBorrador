import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleHud } from '@/composables/battle/useBattleHud'
import { useGameStore } from '@/stores/game'

describe('useBattleHud Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('suppresses enemy HUD when enemy seat is fainted or empty', () => {
    const mockAnimations = {
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      isEmerging: ref(false),
      isWildEntryAnimation: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      wildRevealActive: ref(false),
      seats: ref({
        seat1: { entry: {}, exit: {} },
        seat2: { entry: {}, exit: {} }
      })
    } as any

    const mockBattleStore = {
      state: ref({ enemy: null, player: { hp: 100 } }),
      fsm: { currentState: ref('ACTIVE_BATTLE'), currentSubState: ref('WAIT_INPUT') },
      isSearching: false,
      isFinishing: false,
      currentFsmState: ref('ACTIVE_BATTLE'),
      currentSubState: ref('WAIT_INPUT')
    } as any

    const enemyRef = ref(null)

    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)
    expect(hud.isEnemyHudSuppressed.value).toBe(true)
    expect(hud.isPlayerHudSuppressed.value).toBe(false)
  })

  it('scrambles enemy data when in INITIALIZING or silhouette substates without binoculars', () => {
    const mockAnimations = {
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      isEmerging: ref(false),
      isWildEntryAnimation: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      wildRevealActive: ref(false),
      seats: ref({ seat1: { entry: {} }, seat2: { entry: {} } })
    } as any

    const mockBattleStore = {
      state: ref({ enemy: { id: 'pikachu', hp: 100 } }),
      fsm: { currentState: ref('INITIALIZING'), currentSubState: ref('PREPARATION') },
      isSearching: false,
      isFinishing: false
    } as any

    const hud = useBattleHud(mockAnimations, mockBattleStore, ref(null))
    expect(hud.shouldScrambleEnemyData.value).toBe(true)
  })

  it('correctly identifies floating enemy state', () => {
    const mockAnimations = {
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      isEmerging: ref(false),
      isWildEntryAnimation: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      wildRevealActive: ref(false),
      seats: ref({ seat1: { entry: {} }, seat2: { entry: {} } })
    } as any

    const mockBattleStore = {
      state: ref({ enemy: { id: 'pidgeot', ability: 'keeneye' } }),
      fsm: { currentState: ref('ACTIVE_BATTLE'), currentSubState: ref('WAIT_INPUT') },
      isSearching: false,
      isFinishing: false
    } as any

    const enemyRef = ref({ id: 'pidgeot', ability: 'keeneye' } as any)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)
    expect(typeof hud.enemyIsFloating.value).toBe('boolean')
  })

  it('suppresses enemy HUD during trainer encounter in SEARCH_PHASE and FIRST_INTRO before POKEMON_CALL', () => {
    const mockAnimations = {
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      isEmerging: ref(false),
      isWildEntryAnimation: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      wildRevealActive: ref(false),
      seats: ref({ seat1: { entry: {} }, seat2: { entry: {} } })
    } as any

    const mockBattleStore = {
      state: ref({ enemy: { id: 'alakazam', hp: 100 }, isTrainer: true }),
      fsm: { currentState: ref('SEARCH_PHASE'), currentSubState: ref('COMBAT_OR_FLEE') },
      isSearching: true,
      isFinishing: false
    } as any

    const hud = useBattleHud(mockAnimations, mockBattleStore, ref(null))
    expect(hud.isEnemyHudSuppressed.value).toBe(true)

    // When transitioning to FIRST_INTRO SHOW_DIALOGS, HUD remains suppressed
    mockBattleStore.fsm.currentState.value = 'FIRST_INTRO'
    mockBattleStore.fsm.currentSubState.value = 'SHOW_DIALOGS'
    expect(hud.isEnemyHudSuppressed.value).toBe(true)

    // Once POKEMON_CALL happens, HUD is unsuppressed
    mockBattleStore.fsm.currentSubState.value = 'POKEMON_CALL'
    expect(hud.isEnemyHudSuppressed.value).toBe(false)
  })

  it('keeps enemy data scrambled for trainer encounters even if player has binoculars in inventory', () => {
    const gameStore = useGameStore()
    gameStore.state.inventory = { binoculars: 1 }

    const mockAnimations = {
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      isEmerging: ref(false),
      isWildEntryAnimation: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      wildRevealActive: ref(false),
      seats: ref({ seat1: { entry: {} }, seat2: { entry: {} } })
    } as any

    const mockBattleStore = {
      state: ref({ enemy: { id: 'alakazam', hp: 100 }, isTrainer: true }),
      fsm: { currentState: ref('FIRST_INTRO'), currentSubState: ref('SHOW_DIALOGS') },
      isSearching: false,
      isFinishing: false
    } as any

    const hud = useBattleHud(mockAnimations, mockBattleStore, ref(null))
    expect(hud.shouldScrambleEnemyData.value).toBe(true)
  })
})
