import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useGameStore } from '@/stores/game'
import type { useBattleStore } from '@/stores/battle'
import type { useBattleAnimations } from '@/composables/useBattleAnimations'
import type { Pokemon } from '@/types/pokemon'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

/**
 * Composable para gestionar la visibilidad y estados del HUD en combate.
 * Centraliza la lógica de supresión para evitar interferencias entre bandos.
 */
export function useBattleHud(
  animations: ReturnType<typeof useBattleAnimations>, 
  battleStore: ReturnType<typeof useBattleStore>, 
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  const {
    isFaintInProgress,
    faintedPokemonSnapshot,
    caughtPokemonSnapshot,
    seats
  } = animations

  /**
   * Determina si el HUD del enemigo debe estar oculto.
   * REGLA MAESTRA: Asiento ocupado (hay enemigo) -> HUD Visible. Asiento vacío -> HUD Oculto.
   */
  const isEnemyHudSuppressed = computed(() => {
    const s = toValue(battleStore.state)

    const isArchaeology = !!s?.isArchaeology
      
    if (isArchaeology) return true

    // Comprobaciones basadas en el Asiento Enemigo (seat2)
    const seat = seats.value.seat2
    const isCapturing = seat?.entry.isCaptureActive || seat?.entry.isAnimatingCapture || 
                        seat?.exit.isCaptureActive || seat?.exit.isAnimatingCapture ||
                        seat?.entry.animState === 'catching' || seat?.exit.animState === 'catching'

    const isFainted = (s?.enemy && s.enemy.hp <= 0) || 
                      (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy')

    if (isCapturing || isFainted) {
      return true
    }

    const isTrainerIntro = s?.isTrainer || s?.isGym || s?.isPvP
    const isFirstIntroState = toValue(battleStore.fsm?.currentState) === 'FIRST_INTRO'
    if (isTrainerIntro && isFirstIntroState) {
      return false
    }

    return !s?.enemy
  })

  const isPlayerHudSuppressed = computed(() => {
    const s = toValue(battleStore.state)

    // Comprobaciones basadas en el Asiento Jugador (seat1)
    const seat = seats.value.seat1
    const isCapturing = seat?.entry.isCaptureActive || seat?.entry.isAnimatingCapture || 
                        seat?.exit.isCaptureActive || seat?.exit.isAnimatingCapture ||
                        seat?.entry.animState === 'catching' || seat?.exit.animState === 'catching'

    const isFainted = (s?.player && s.player.hp <= 0) || 
                      (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player')

    if (isCapturing || isFainted) {
      return true
    }
    return !s?.player
  })

  /**
   * Datos del enemigo activo a mostrar en el HUD, 
   * manejando snapshots de captura y desmayo.
   * [FASE 2] Soporte para previsualización de próximo encuentro.
   */
  const activeEnemyHudData = computed(() => {
    const state = toValue(battleStore.fsm?.currentState)
    if (state === 'REWARDS_PHASE' || state === 'LEVEL_UP_MODAL') return null

    // 1. Prioridad: Snapshot de captura (durante la animación de éxito) en asiento enemigo (seat2)
    const enemySeat = seats.value.seat2
    const isEnemyCaptureActive = enemySeat?.entry.isCaptureActive || 
                                 enemySeat?.entry.isAnimatingCapture || 
                                 enemySeat?.exit.isCaptureActive || 
                                 enemySeat?.exit.isAnimatingCapture
    if (isEnemyCaptureActive && caughtPokemonSnapshot.value) return caughtPokemonSnapshot.value
    
    // 2. Prioridad: Snapshot de desmayo (mientras desaparece)
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') return faintedPokemonSnapshot.value
    
    // 3. Prioridad: Búsqueda / Previsualización (Encuentro Actual)
    if (battleStore.isSearching || battleStore.isFinishing) {
      return toValue(enemyRef) || toValue(battleStore.state)?._initialEnemy
    }

    // 4. Default: El enemigo actual del combate
    return toValue(enemyRef) || toValue(battleStore.state)?._initialEnemy
  })

  const activePlayerHudData = computed(() => {
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player') return faintedPokemonSnapshot.value
    return toValue(battleStore.state)?.player || null
  })

  const activePlayerData = computed(() => {
    return activePlayerHudData.value
  })

  const gs = useGameStore()
  
  /**
   * Determina si los datos del enemigo deben mostrarse como "?" (Scrambled).
   * REGLA: Durante ENTRY_ANIM, ocultar datos a menos que se tenga BINOCULARES.
   */
  const shouldScrambleEnemyData = computed(() => {
    const subState = toValue(battleStore.fsm?.currentSubState)
    const state = toValue(battleStore.fsm?.currentState)
    const inventory = gs.state.inventory || {}
    const hasBinoculars = (inventory.binoculars || 0) > 0

    if (hasBinoculars) return false

    // Regla de inicialización (Manual §19): durante INITIALIZING, CONTEXT_SETUP, SEARCH_PHASE y FIRST_INTRO el Pokémon
    // nunca está revelado. Scramble desde el primer frame, sin importar el substate.
    if (['INITIALIZING', 'CONTEXT_SETUP', 'SEARCH_PHASE', 'FIRST_INTRO'].includes(state || '')) return true

    // Durante ACTIVE_BATTLE: solo en substates donde el Pokémon aún no fue revelado.
    // ENCOUNTER_ANIM cubre el salto desde el arbusto (Manual §19: HP bars remain hidden).
    const isSilhouetteSubstate = [
      'ENTRY_ANIM',
      'ENCOUNTER_ANIM',
      'PARALLEL_PREP',
      'PARALLEL_ENTRY',
      'SILHOUETTE_MODE',
      'COMBAT_OR_FLEE'
    ].includes(subState || '')

    return isSilhouetteSubstate
  })

  // Nuevos estados computados extraídos de BattleArenaView.vue

  const activeEnemyData = computed(() => {
    const s = toValue(battleStore.fsm?.currentState)
    const sub = toValue(battleStore.fsm?.currentSubState)

    if (s === 'REWARDS_PHASE' && sub === 'EMPTY_WAIT') {
      return null
    }
    
    // Si estamos en búsqueda o introducción y el asiento está vacío, 
    // mostramos el 'initialEnemy' como silueta de seguridad (Evita fantasmas)
    const realEnemy = activeEnemyHudData.value
    if (!realEnemy && (s === 'FIRST_INTRO' || s === 'SEARCH_PHASE' || s === 'INITIALIZING')) {
      return toValue(battleStore.state)?._initialEnemy || null
    }

    return realEnemy
  })

  const activeEnemyIsSilhouette = computed(() => {
    if (toValue(battleStore.isSilhouetteMode)) return true
    const state = toValue(battleStore.fsm?.currentState)
    if (state && ['INITIALIZING', 'SEARCH_PHASE', 'FIRST_INTRO'].includes(state)) {
      const s = toValue(battleStore.state)
      if (s && !s.isTrainer && !s.isGym) return true
    }
    const sub = toValue(battleStore.fsm?.currentSubState)
    if (!sub) return false
    return [
      'PARALLEL_PREP', 'PARALLEL_ENTRY', 'BUSH_VISIBLE', 'SILHOUETTE_MODE', 'COMBAT_OR_FLEE', 
      'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'PARALLEL_JUMP', 'MINIGAME_CHECK'
    ].includes(sub)
  })

  const bushIsBehind = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState)
    if (!sub) return false
    return animations.isEmerging.value || ['ENCOUNTER_ANIM', 'PARALLEL_JUMP', 'REVEAL_COLORS', 'BUSH_FADE'].includes(sub)
  })

  const enemyIsJumping = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState)
    if (!sub) return false
    return animations.isEmerging.value || sub === 'ENCOUNTER_ANIM' || sub === 'PARALLEL_JUMP'
  })

  const isInstantBush = computed(() => {
    if (animations.isInitialLoad.value) return true
    const sub = toValue(battleStore.fsm?.currentSubState)
    return toValue(battleStore.fsm?.currentState) === 'FIRST_INTRO' || sub === 'PREPARATION' || sub === 'ENTRY_ANIM'
  })

  const enemyIsFloating = computed(() => {
    if (!activeEnemyData.value) return false
    const p = activeEnemyData.value
    const data = p.id ? pokemonDataProvider.getPokemonData(p.id) : null
    if (!data) return false
    if (data.isFloating !== undefined) return data.isFloating
    
    const isFlying = data.type === 'flying' || data.type2 === 'flying'
    const isLevitating = p.ability === 'Levitación'
    if (isFlying || isLevitating) return true

    return false
  })

  const isWildEncounter = computed(() => {
    const state = toValue(battleStore.state)
    if (state) {
      return !state.isTrainer && !state.isGym
    }
    return !!toValue(battleStore.isSearching)
  })

  const isEnemyTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState)
    const state = toValue(battleStore.fsm?.currentState)
    const battleState = toValue(battleStore.state)
    const isTrainer = !!(battleState?.isTrainer || battleState?.isGym)
    
    // 1. Forzar ocultación en estados de promoción técnica (Slot 2 -> Slot 1) o durante el minijuego
    if (sub === 'GEN_TEAMS' || sub === 'MINIGAME_CHECK') return true
    
    // 2. Si estamos en búsqueda, ocultar durante la generación técnica de datos
    if (state === 'SEARCH_PHASE') {
      const technicalSubstates = [
        'RECEIVE_CONFIG', 'WEIGHT_CALCULATION', 'INJECT_FILTERS', 
        'READY_FOR_GEN'
      ]
      if (technicalSubstates.includes(sub || '')) return true
    }

    // 3. Ocultar mientras el entrenador es visible (Mood Visual)
    const trainerVisibleStates = [
      'ENCOUNTER_TYPE_CHECK',
      'TRAINER_ENTRY',
      'T_VISUAL',
      'SHOW_DIALOGS',
      'TRAINER_ENCOUNTER',
      'RETREAT_AND_FADEOUT',
      'T_RETREAT'
    ]
    if (isTrainer && trainerVisibleStates.includes(sub || '')) return true
    
    return false
  })

  const isPlayerTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.currentSubState)
    const state = toValue(battleStore.state)
    const isTrainer = state?.isTrainer || state?.isGym
    
    // El jugador está oculto mientras el entrenador del jugador es visible (Mood Visual)
    // Por ahora la lógica de entrada de entrenador jugador es síncrona con POKEMON_CALL
    return !!isTrainer && ['TRAINER_ENTRY', 'T_VISUAL'].includes(sub || '')
  })

  const shouldShowEncounterLayers = computed(() => {
    const animState = animations.enemyAnimState.value
    if (animState === 'catching' || animState === 'trapped' || animState === 'releasing') return false
    if (animations.isCaptureSequenceActive.value || animations.isFaintInProgress.value) return false
    
    // Si el Pokémon vuela, no mostramos capas ambientales (arbustos)
    if (enemyIsFloating.value) return false

    const fsmSub = toValue(battleStore.fsm?.currentSubState)
    // Mostrar capas (arbustos) en todos los estados de búsqueda y entrada salvaje plana
    if (['PARALLEL_ENTRY', 'PARALLEL_JUMP', 'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'COMBAT_OR_FLEE', 'WILD_ENTRY', 'BUSH_FADE', 'REVEAL_COLORS'].includes(fsmSub || '')) {
      return isWildEncounter.value
    }

    return isWildEncounter.value && (battleStore.isSearching || animations.wildRevealActive.value)
  })

  return {
    isEnemyHudSuppressed,
    isPlayerHudSuppressed,
    activeEnemyHudData,
    shouldScrambleEnemyData,
    activeEnemyData,
    activePlayerData,
    activeEnemyIsSilhouette,
    bushIsBehind,
    enemyIsJumping,
    isInstantBush,
    enemyIsFloating,
    isWildEncounter,
    isEnemyTechnicalHidden,
    isPlayerTechnicalHidden,
    shouldShowEncounterLayers
  }
}

