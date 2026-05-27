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
    isCaptureSequenceActive,
    caughtPokemonSnapshot
  } = animations

  /**
   * Determina si el HUD del enemigo debe estar oculto.
   * REGLA MAESTRA: Asiento ocupado -> HUD Visible. Asiento vacío -> HUD Oculto.
   */
  const isEnemyHudSuppressed = computed(() => {
    const s = toValue(battleStore.state)
    // REGLA MAESTRA: Ocultar si no hay enemigo activo Y no hay previsualización inicial
    return !s?.enemy && !s?._initialEnemy
  })

  /**
   * Determina si el HUD del jugador debe estar oculto.
   * REGLA MAESTRA: Asiento ocupado -> HUD Visible. Asiento vacío -> HUD Oculto.
   */
  const isPlayerHudSuppressed = computed(() => {
    return !toValue(battleStore.state)?.player
  })

  /**
   * Datos del enemigo activo a mostrar en el HUD, 
   * manejando snapshots de captura y desmayo.
   * [FASE 2] Soporte para previsualización de próximo encuentro.
   */
  const activeEnemyHudData = computed(() => {
    const state = toValue(battleStore.fsm?.currentState)
    const subState = toValue(battleStore.fsm?.currentSubState)
    if (state === 'REWARDS_PHASE' && subState === 'EMPTY_WAIT') return null

    // 1. Prioridad: Snapshot de captura (durante la animación de éxito)
    if (isCaptureSequenceActive.value && caughtPokemonSnapshot.value) return caughtPokemonSnapshot.value
    
    // 2. Prioridad: Snapshot de desmayo (mientras desaparece)
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') return faintedPokemonSnapshot.value
    
    // 3. Prioridad: Búsqueda / Previsualización (Encuentro Actual)
    if (battleStore.isSearching || battleStore.isFinishing) {
      return toValue(enemyRef) || toValue(battleStore.state)?._initialEnemy
    }

    // 4. Default: El enemigo actual del combate
    return toValue(enemyRef) || toValue(battleStore.state)?._initialEnemy
  })

  const gs = useGameStore()
  
  /**
   * Determina si los datos del enemigo deben mostrarse como "?" (Scrambled).
   * REGLA: Durante ENTRY_ANIM, ocultar datos a menos que se tenga BINOCULARES.
   */
  const shouldScrambleEnemyData = computed(() => {
    const subState = toValue(battleStore.fsm?.currentSubState)
    const inventory = gs.state.inventory || {}
    const hasBinoculars = (inventory.binoculars || 0) > 0
    
    const isSilhouetteState = [
      'ENTRY_ANIM', 
      'PARALLEL_PREP', 
      'PARALLEL_ENTRY', 
      'SILHOUETTE_MODE', 
      'BUSH_IDLE'
    ].includes(subState || '')

    return isSilhouetteState && !hasBinoculars
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
    const sub = toValue(battleStore.fsm?.currentSubState)
    if (!sub) return false
    return [
      'PARALLEL_PREP', 'PARALLEL_ENTRY', 'SILHOUETTE_MODE', 'BUSH_IDLE', 
      'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'PARALLEL_JUMP'
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
    return toValue(battleStore.fsm?.currentState) === 'FIRST_INTRO' || sub === 'BUSH_VISIBLE'
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
    if (toValue(battleStore.isSearching)) return true
    const state = toValue(battleStore.state)
    return !!(state && !state.isTrainer && !state.isGym)
  })

  const isEnemyTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState)
    const state = toValue(battleStore.fsm?.currentState)
    const isTrainer = !isWildEncounter.value
    
    // 1. Forzar ocultación en estados de promoción técnica (Slot 2 -> Slot 1)
    if (sub === 'GEN_TEAMS') return true
    
    // 2. Si estamos en búsqueda, ocultar durante la generación técnica de datos
    if (state === 'SEARCH_PHASE') {
      const technicalSubstates = [
        'RECEIVE_CONFIG', 'WEIGHT_CALCULATION', 'INJECT_FILTERS', 
        'READY_FOR_GEN'
      ]
      if (technicalSubstates.includes(sub || '')) return true
    }

    // 3. Ocultar mientras el entrenador es visible (Mood Visual)
    const trainerVisibleStates = ['TRAINER_ENTRY', 'T_VISUAL', 'TRAINER_RETREAT', 'POKEMON_CALL', 'RENDER_BALL']
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
    if (fsmSub && ['PARALLEL_ENTRY', 'PARALLEL_JUMP', 'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'BUSH_IDLE', 'WILD_ENTRY', 'BUSH_FADE', 'REVEAL_COLORS'].includes(fsmSub)) {
      return isWildEncounter.value
    }

    return isWildEncounter.value && (toValue(battleStore.isSearching) || animations.wildRevealActive.value)
  })

  return {
    isEnemyHudSuppressed,
    isPlayerHudSuppressed,
    activeEnemyHudData,
    shouldScrambleEnemyData,
    activeEnemyData,
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

