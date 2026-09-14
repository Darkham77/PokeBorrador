import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants'
import { useBattleHud } from '@/composables/battle/useBattleHud'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Wild Encounter Bushes & Sprite Visibility vs Trainer Empty Seat (Tier 1 RED)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('verifies wild encounter shows bushes and silhouette sprite during SEARCH_PHASE PREPARATION', () => {
    const wildPoke = makePokemon('pidgey', 5, { bypassWhitelist: true }) as Pokemon

    // Mock battleStore state
    const currentFsmState = ref('SEARCH_PHASE')
    const currentSubState = ref('PREPARATION')
    const isSearching = computed(() => currentFsmState.value === 'SEARCH_PHASE')

    const battleState = ref({
      isTrainer: false,
      isGym: false,
      isPvP: false,
      locationId: 'route1',
      enemy: wildPoke,
      enemyTeam: [wildPoke],
      player: makePokemon('bulbasaur', 5, { bypassWhitelist: true }) as Pokemon
    })

    const mockBattleStore = {
      state: battleState.value,
      currentFsmState,
      currentSubState,
      isSearching,
      isSilhouetteMode: ref(true),
      attackerSide: ref(null),
      activeMove: null,
      enemyStages: {},
      playerStages: {},
      exitingPlayer: ref(null),
      exitingEnemy: ref(null),
      fsm: {
        currentState: currentFsmState,
        currentSubState: currentSubState
      }
    } as any

    const mockAnimations = {
      isWildSilhouette: ref(true),
      isWildEntryAnimation: ref(false),
      wildRevealActive: ref(false),
      isEmerging: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      seats: ref({
        seat1: { entry: {}, exit: {} },
        seat2: { entry: {}, exit: {} }
      })
    } as any

    const enemyRef = computed(() => mockBattleStore.state.enemy)
    const playerRef = computed(() => mockBattleStore.state.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

    // 1. Enemy must be in combatants (Seat 2 occupied for wild encounter)
    expect(enemyCombatants.value).toHaveLength(1)
    expect(enemyCombatants.value[0]?.id).toBe('pidgey')

    // 2. Sprite must NOT be technically hidden in SEARCH_PHASE PREPARATION
    expect(hud.isEnemyTechnicalHidden.value).toBe(false)

    // 3. Bushes (CombatGrass) MUST be visible around Seat 2 in SEARCH_PHASE PREPARATION
    expect(hud.shouldShowEncounterLayers.value).toBe(true)

    // 4. Wild sprite must be in silhouette
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)
  })

  it('verifies trainer encounters keep Seat 2 strictly EMPTY during SEARCH_PHASE and FIRST_INTRO before POKEMON_CALL', () => {
    const trainerPoke = makePokemon('geodude', 12, { bypassWhitelist: true }) as Pokemon

    const currentFsmState = ref('SEARCH_PHASE')
    const currentSubState = ref('PREPARATION')
    const isSearching = computed(() => currentFsmState.value === 'SEARCH_PHASE')

    const battleState = ref({
      isTrainer: true,
      trainerName: 'Brock',
      isGym: true,
      isPvP: false,
      locationId: 'route1',
      enemy: null as Pokemon | null, // Seat 2 is empty
      enemyTeam: [trainerPoke],
      player: makePokemon('charmander', 10, { bypassWhitelist: true }) as Pokemon
    })

    const mockBattleStore = {
      state: battleState.value,
      currentFsmState,
      currentSubState,
      isSearching,
      isSilhouetteMode: ref(false),
      attackerSide: ref(null),
      activeMove: null,
      enemyStages: {},
      playerStages: {},
      exitingPlayer: ref(null),
      exitingEnemy: ref(null),
      fsm: {
        currentState: currentFsmState,
        currentSubState: currentSubState
      }
    } as any

    const mockAnimations = {
      isWildSilhouette: ref(false),
      isWildEntryAnimation: ref(false),
      wildRevealActive: ref(false),
      isEmerging: ref(false),
      isInitialLoad: ref(false),
      isCaptureSequenceActive: ref(false),
      isFaintInProgress: ref(false),
      faintedPokemonSnapshot: ref(null),
      caughtPokemonSnapshot: ref(null),
      enemyAnimState: ref(null),
      seats: ref({
        seat1: { entry: {}, exit: {} },
        seat2: { entry: {}, exit: {} }
      })
    } as any

    const enemyRef = computed(() => mockBattleStore.state.enemy)
    const playerRef = computed(() => mockBattleStore.state.player)

    const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

    // In SEARCH_PHASE for trainer: Seat 2 MUST be empty
    expect(enemyCombatants.value).toHaveLength(0)
    expect(hud.shouldShowEncounterLayers.value).toBe(false)

    // In FIRST_INTRO before POKEMON_CALL: Seat 2 MUST be empty
    currentFsmState.value = 'FIRST_INTRO'
    currentSubState.value = 'SHOW_DIALOGS'
    expect(enemyCombatants.value).toHaveLength(0)

    // At POKEMON_CALL: Seat 2 is occupied
    currentSubState.value = 'POKEMON_CALL'
    battleState.value.enemy = trainerPoke
    expect(enemyCombatants.value).toHaveLength(1)
    expect(enemyCombatants.value[0]?.id).toBe('geodude')
  })
})
