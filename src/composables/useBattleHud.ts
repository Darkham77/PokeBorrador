import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

/**
 * Composable para gestionar la visibilidad y estados del HUD en combate.
 * Centraliza la lógica de supresión para evitar interferencias entre bandos.
 */
export function useBattleHud(animations, battleStore, enemyRef) {
  const {
    // @ts-ignore
    playerAnimState,
    // @ts-ignore
    enemyAnimState,
    isFaintInProgress,
    faintedPokemonSnapshot,
    // @ts-ignore
    enemyCaptureActive,
    isCaptureSequenceActive,
    caughtPokemonSnapshot,
    // @ts-ignore
    isIntroInProgress
  } = animations

  const unwrap = (val) => (val && typeof val === 'object' && 'value' in val ? val.value : val)

  /**
   * Determina si el HUD del enemigo debe estar oculto.
   * REGLA MAESTRA: Asiento ocupado -> HUD Visible. Asiento vacío -> HUD Oculto.
   */
  const isEnemyHudSuppressed = computed(() => {
    const s = unwrap(battleStore.state)
    // REGLA MAESTRA: Ocultar si no hay enemigo activo Y no hay previsualización inicial
    return !s?.enemy && !s?._initialEnemy
  })

  /**
   * Determina si el HUD del jugador debe estar oculto.
   * REGLA MAESTRA: Asiento ocupado -> HUD Visible. Asiento vacío -> HUD Oculto.
   */
  const isPlayerHudSuppressed = computed(() => {
    return !battleStore.state.player
  })

  /**
   * Datos del enemigo activo a mostrar en el HUD, 
   * manejando snapshots de captura y desmayo.
   */
  /**
   * Datos del enemigo activo a mostrar en el HUD, 
   * manejando snapshots de captura y desmayo.
   * [FASE 2] Soporte para previsualización de próximo encuentro.
   */
  const activeEnemyHudData = computed(() => {
    const state = unwrap(battleStore.fsm?.currentState)
    const subState = unwrap(battleStore.fsm?.currentSubState)
    if (state === 'REWARDS_PHASE' && subState === 'EMPTY_WAIT') return null

    // 1. Prioridad: Snapshot de captura (durante la animación de éxito)
    if (isCaptureSequenceActive.value && caughtPokemonSnapshot.value) return caughtPokemonSnapshot.value
    
    // 2. Prioridad: Snapshot de desmayo (mientras desaparece)
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') return faintedPokemonSnapshot.value
    
    // 3. Prioridad: Búsqueda / Previsualización (Encuentro Actual)
    if (battleStore.isSearching || battleStore.isFinishing) {
      return enemyRef.value || unwrap(battleStore.state)?._initialEnemy
    }

    // 4. Default: El enemigo actual del combate
    return enemyRef.value || unwrap(battleStore.state)?._initialEnemy
  })

  const gs = useGameStore()
  
  /**
   * Determina si los datos del enemigo deben mostrarse como "?" (Scrambled).
   * REGLA: Durante ENTRY_ANIM, ocultar datos a menos que se tenga BINOCULARES.
   */
  const shouldScrambleEnemyData = computed(() => {
    const subState = unwrap(battleStore.fsm?.currentSubState)
    const hasBinoculars = gs.state.inventory?.binoculars > 0
    
    const isSilhouetteState = [
      'ENTRY_ANIM', 
      'PARALLEL_PREP', 
      'PARALLEL_ENTRY', 
      'SILHOUETTE_MODE', 
      'BUSH_IDLE'
    ].includes(subState)

    return isSilhouetteState && !hasBinoculars
  })

  return {
    isEnemyHudSuppressed,
    isPlayerHudSuppressed,
    activeEnemyHudData,
    shouldScrambleEnemyData
  }
}
