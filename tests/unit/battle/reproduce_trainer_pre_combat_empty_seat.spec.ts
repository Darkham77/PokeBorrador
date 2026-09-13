import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants'
import type { useBattleStore } from '@/stores/battle/battle'

describe('NPC Trainer Pre-Combat Empty Seat Contract (Tier 1 RED Reproduction)', () => {
  it('suppresses enemy combatants in CONTEXT_SETUP when battling an NPC trainer', () => {
    const geodude = makePokemon('geodude', 15, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const mockBattleStore = {
      state: {
        isTrainer: true,
        isGym: false,
        enemy: geodude,
        player: playerPikachu,
        over: false
      },
      currentFsmState: ref('CONTEXT_SETUP'),
      currentSubState: ref('RECEIVE_CONFIG'),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => mockBattleStore.state?.enemy)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)

    // In CONTEXT_SETUP for a trainer, Seat 2 (Enemy) MUST be empty!
    expect(enemyCombatants.value).toEqual([])
  })

  it('suppresses enemy combatants when isGym is true even if isTrainer is false', () => {
    const onix = makePokemon('onix', 14, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const mockBattleStore = {
      state: {
        isTrainer: false,
        isGym: true,
        enemy: onix,
        player: playerPikachu,
        over: false
      },
      currentFsmState: ref('INITIALIZING'),
      currentSubState: ref('CHECK_CONTEXT'),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => mockBattleStore.state?.enemy)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)

    // In Gym battles, enemy combatant MUST be suppressed during INITIALIZING
    expect(enemyCombatants.value).toEqual([])
  })

  it('suppresses enemy combatants during SEARCH_PHASE when encountering an NPC trainer', () => {
    const pidgey = makePokemon('pidgey', 10, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const mockBattleStore = {
      state: {
        isTrainer: true,
        trainerName: 'Joven Chano',
        enemy: pidgey,
        player: playerPikachu,
        over: false
      },
      currentFsmState: ref('SEARCH_PHASE'),
      currentSubState: ref('COMBAT_OR_FLEE'),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => mockBattleStore.state?.enemy)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)

    // While trainer is in SEARCH_PHASE (speaking dialogue / COMBAT_OR_FLEE), Pokémon MUST NOT be in Seat 2!
    expect(enemyCombatants.value).toEqual([])
  })

  it('suppresses enemy combatants in FIRST_INTRO before POKEMON_CALL, and reveals at POKEMON_CALL', () => {
    const rattata = makePokemon('rattata', 12, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const currentState = ref('FIRST_INTRO')
    const currentSubState = ref('TRAINER_ENCOUNTER')

    const mockBattleStore = {
      state: {
        isTrainer: true,
        enemy: rattata,
        player: playerPikachu,
        over: false
      },
      currentFsmState: currentState,
      currentSubState: currentSubState,
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => mockBattleStore.state?.enemy)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)

    // 1. During TRAINER_ENCOUNTER, enemy seat is empty
    expect(enemyCombatants.value).toEqual([])

    // 2. During RETREAT_AND_FADEOUT, enemy seat is still empty
    currentSubState.value = 'RETREAT_AND_FADEOUT'
    expect(enemyCombatants.value).toEqual([])

    // 3. At POKEMON_CALL, trainer throws Poké Ball and Pokémon occupies Seat 2!
    currentSubState.value = 'POKEMON_CALL'
    expect(enemyCombatants.value).toHaveLength(1)
    expect(enemyCombatants.value[0]?.name).toBe(rattata.name)
  })

  it('vacates enemy seat during CONTEXT_SETUP even for wild encounters until search/intro is primed', () => {
    const weedle = makePokemon('weedle', 5, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const mockBattleStore = {
      state: {
        isTrainer: false,
        isGym: false,
        enemy: weedle,
        player: playerPikachu,
        over: false
      },
      currentFsmState: ref('CONTEXT_SETUP'),
      currentSubState: ref('VACATE_ALL_SEATS'),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => mockBattleStore.state?.enemy)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)

    // During CONTEXT_SETUP, Seat 2 (Enemy) MUST be empty even for wild encounters!
    expect(enemyCombatants.value).toEqual([])
  })

  it('vacates player seat during CONTEXT_SETUP to eliminate initial unprimed render frames', () => {
    const playerPikachu = makePokemon('pikachu', 20, { bypassWhitelist: true }) as Pokemon

    const mockBattleStore = {
      state: {
        player: playerPikachu,
        over: false
      },
      currentFsmState: ref('CONTEXT_SETUP'),
      currentSubState: ref('RECEIVE_CONFIG'),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      fsm: null
    } as unknown as ReturnType<typeof useBattleStore>

    const enemyRef = computed(() => null)
    const playerRef = computed(() => mockBattleStore.state?.player)

    const { playerCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)
    expect(playerCombatants.value).toEqual([])
  })

  it('ensures useBattleHud suppresses HUD and yields null activeEnemyData during CONTEXT_SETUP, INITIALIZING and pre-call, never leaking _initialEnemy', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useBattleHud } = await import('@/composables/battle/useBattleHud')

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

    const geodude = makePokemon('geodude', 15, { bypassWhitelist: true }) as Pokemon

    const fsmState = ref('CONTEXT_SETUP')
    const fsmSubState = ref('RECEIVE_CONFIG')

    const mockBattleStore = {
      state: ref({
        enemy: null,
        _initialEnemy: geodude,
        player: { hp: 100 },
        isTrainer: true
      }),
      fsm: { currentState: fsmState, currentSubState: fsmSubState },
      isSearching: false,
      isFinishing: false,
      currentFsmState: fsmState,
      currentSubState: fsmSubState
    } as any

    const enemyRef = computed(() => mockBattleStore.state.value?.enemy)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

    // 1. In CONTEXT_SETUP:
    expect(hud.isEnemyHudSuppressed.value).toBe(true)
    expect(hud.isPlayerHudSuppressed.value).toBe(true)
    expect(hud.activeEnemyData.value).toBeNull()

    // 2. In INITIALIZING:
    fsmState.value = 'INITIALIZING'
    fsmSubState.value = 'CHECK_CONTEXT'
    expect(hud.isEnemyHudSuppressed.value).toBe(true)
    expect(hud.activeEnemyData.value).toBeNull()

    // 3. In SEARCH_PHASE (Trainer dialogue):
    fsmState.value = 'SEARCH_PHASE'
    fsmSubState.value = 'COMBAT_OR_FLEE'
    expect(hud.isEnemyHudSuppressed.value).toBe(true)
    expect(hud.activeEnemyData.value).toBeNull()

    // 4. In FIRST_INTRO RETREAT_AND_FADEOUT (Trainer retreating):
    fsmState.value = 'FIRST_INTRO'
    fsmSubState.value = 'RETREAT_AND_FADEOUT'
    expect(hud.isEnemyHudSuppressed.value).toBe(true)
    expect(hud.activeEnemyData.value).toBeNull()

    // 5. At POKEMON_CALL: Enemy is summoned to Seat 2!
    mockBattleStore.state.value.enemy = geodude
    fsmSubState.value = 'POKEMON_CALL'
    expect(hud.isEnemyHudSuppressed.value).toBe(false)
    expect(hud.activeEnemyData.value).toEqual(geodude)
  })
})

