import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleHud } from '@/composables/battle/useBattleHud'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Battle Silhouette & FX Lighting Parity Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Tier 1 RED: ensures wild search encounters maintain silhouette during CONTEXT_SETUP and INITIALIZING', () => {
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
      isWildSilhouette: ref(false),
      seats: ref({
        seat1: { entry: {}, exit: {} },
        seat2: { entry: {}, exit: {} }
      })
    } as any

    const mockBattleStore = {
      state: ref({
        enemy: { uid: 'wild-1', id: 'pidgey', hp: 100 } as Pokemon,
        player: { uid: 'p-1', hp: 100 } as Pokemon,
        wasSearching: true,
        isTrainer: false,
        isGym: false
      }),
      fsm: { currentState: ref('CONTEXT_SETUP'), currentSubState: ref('RECEIVE_CONFIG') },
      isSearching: true,
      isFinishing: false,
      isSilhouetteMode: ref(false),
      currentFsmState: ref('CONTEXT_SETUP'),
      currentSubState: ref('RECEIVE_CONFIG')
    } as any

    const enemyRef = ref(mockBattleStore.state.value.enemy)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

    // In CONTEXT_SETUP / RECEIVE_CONFIG:
    // 1. activeEnemyIsSilhouette MUST be true for wild search encounters so it never renders normal
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)

    // 2. The enemy must also be technically hidden during configuration substates
    expect(hud.isEnemyTechnicalHidden.value).toBe(true)

    // Advance to INITIALIZING / PRELOAD_COORDS
    mockBattleStore.fsm.currentState.value = 'INITIALIZING'
    mockBattleStore.fsm.currentSubState.value = 'PRELOAD_COORDS'
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)
    expect(hud.isEnemyTechnicalHidden.value).toBe(true)
  })

  it('Tier 1 RED: maintains silhouette when fleeing or closing modal before active combat', () => {
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
      isWildSilhouette: ref(false),
      seats: ref({
        seat1: { entry: {}, exit: {} },
        seat2: { entry: {}, exit: {} }
      })
    } as any

    const mockBattleStore = {
      state: ref({
        enemy: { uid: 'wild-1', id: 'pidgey', hp: 100 } as Pokemon,
        player: { uid: 'p-1', hp: 100 } as Pokemon,
        wasSearching: true,
        isTrainer: false,
        isGym: false
      }),
      fsm: { currentState: ref('SEARCH_PHASE'), currentSubState: ref('COMBAT_OR_FLEE') },
      isSearching: true,
      isFinishing: false,
      isSilhouetteMode: ref(false),
      currentFsmState: ref('SEARCH_PHASE'),
      currentSubState: ref('COMBAT_OR_FLEE')
    } as any

    const enemyRef = ref(mockBattleStore.state.value.enemy)
    const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

    // In SEARCH_PHASE, silhouette is true
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)

    // Player clicks close button (X) / flees: FSM transitions to REWARDS_PHASE / WAIT_LOG_QUEUE_ONLY then EXIT_BATTLE
    mockBattleStore.fsm.currentState.value = 'REWARDS_PHASE'
    mockBattleStore.fsm.currentSubState.value = 'WAIT_LOG_QUEUE_ONLY'
    // Silhouette MUST remain active while exiting so it doesn't reveal the normal pokemon
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)

    mockBattleStore.fsm.currentState.value = 'EXIT_BATTLE'
    mockBattleStore.fsm.currentSubState.value = 'CLEAR_UI'
    expect(hud.activeEnemyIsSilhouette.value).toBe(true)
  })

  it('Tier 1 RED: verifies weatherOnlyFilter isolates FX from night cycle darkening', () => {
    // Night with thunderstorm
    const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
      weather: 'thunderstorm',
      cycle: 'night'
    })

    // atmosphereFilter includes night cycle darkening (brightness < 0.6)
    expect(atmosphereFilter.value).toContain('brightness')
    
    // weatherOnlyFilter MUST NOT contain the night cycle brightness reduction
    expect(weatherOnlyFilter.value).not.toBe(atmosphereFilter.value)
    
    // Night with clear weather: weatherOnlyFilter should have brightness(1) and atmosphereFilter has night brightness
    const clearNight = useWeatherVisuals({
      weather: 'clear',
      cycle: 'night'
    })
    expect(clearNight.weatherOnlyFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
    expect(clearNight.atmosphereFilter.value).not.toBe(clearNight.weatherOnlyFilter.value)
    expect(clearNight.atmosphereFilter.value).toContain('brightness(0.6)')
  })
})
