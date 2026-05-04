import { computed } from 'vue'

/**
 * Composable para gestionar la visibilidad y estados del HUD en combate.
 * Centraliza la lógica de supresión para evitar interferencias entre bandos.
 */
export function useBattleHud(animations, battleStore, enemyRef) {
  const {
    playerAnimState,
    enemyAnimState,
    isFaintInProgress,
    faintedPokemonSnapshot,
    enemyCaptureActive,
    isCaptureSequenceActive,
    caughtPokemonSnapshot,
    isIntroInProgress
  } = animations

  const unwrap = (val) => (val && typeof val === 'object' && 'value' in val ? val.value : val)

  /**
   * Determina si el HUD del enemigo debe estar oculto.
   */
  const isEnemyHudSuppressed = computed(() => {
    const state = unwrap(battleStore.fsm?.currentState)
    return state === 'INITIALIZING' ||
           state === 'FIRST_INTRO' ||
           isIntroInProgress.value ||
           enemyAnimState.value === 'trapped' || 
           enemyAnimState.value === 'catching' ||
           enemyAnimState.value === 'releasing' ||
           (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') ||
           enemyCaptureActive.value ||
           battleStore.isSearching
  })

  /**
   * Determina si el HUD del jugador debe estar oculto.
   * Totalmente independiente de lo que le pase al enemigo.
   */
  const isPlayerHudSuppressed = computed(() => {
    const state = unwrap(battleStore.fsm?.currentState)
    return state === 'INITIALIZING' ||
           state === 'FIRST_INTRO' ||
           isIntroInProgress.value ||
           playerAnimState.value === 'releasing' ||
           playerAnimState.value === 'trapped' ||
           (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player') ||
           battleStore.isSearching
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
    if (state === 'REWARDS_PHASE' && subState === 'VOID_STATE') return null

    // 1. Prioridad: Snapshot de captura (durante la animación de éxito)
    if (isCaptureSequenceActive.value && caughtPokemonSnapshot.value) return caughtPokemonSnapshot.value
    
    // 2. Prioridad: Snapshot de desmayo (mientras desaparece)
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') return faintedPokemonSnapshot.value
    
    // 3. Prioridad: Búsqueda / Previsualización (Próximo Pokemon)
    if (battleStore.isSearching || battleStore.isFinishing) {
      return battleStore.upcomingPokemon || enemyRef.value
    }

    // 4. Default: El enemigo actual del combate
    return enemyRef.value || battleStore.upcomingPokemon
  })

  return {
    isEnemyHudSuppressed,
    isPlayerHudSuppressed,
    activeEnemyHudData
  }
}
