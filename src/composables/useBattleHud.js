import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

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
    const sub = unwrap(battleStore.fsm?.currentSubState)

    // Si estamos en SEARCH_PHASE o FIRST_INTRO y hay binoculares, no suprimir (HUD_SYNC rule)
    const hasBinoculars = useGameStore().state.inventory?.['binoculars'] > 0
    if ((state === 'SEARCH_PHASE' || state === 'FIRST_INTRO') && (hasBinoculars || battleStore.debugBinoculars)) {
      return false
    }

    // El HUD se muestra durante el llamado (POKEMON_CALL) según el manual
    if (sub === 'POKEMON_CALL' || sub === 'SHOW_PLAYER_COMBAT_HUD' || sub === 'SHOW_ENEMY_COMBAT_HUD') {
      return false
    }

    return state === 'INITIALIZING' ||
           state === 'FIRST_INTRO' ||
           (isIntroInProgress.value && state !== 'REORDER_TEAM') ||
           enemyAnimState.value === 'trapped' || 
           enemyAnimState.value === 'catching' ||
           enemyAnimState.value === 'releasing' ||
           (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') ||
           (battleStore.faintedSides?.has('enemy') && ['SPRITE_FAINT', 'WAIT_FAINT', 'POKEMON_RECALL'].includes(sub)) ||
           ['HIDE_ENEMY_COMBAT_HUD', 'CATCH_SHAKE', 'CATCH_SUCCESS', 'HIDE_ENEMY_COMBAT_HUD_ESC', 'HIDE_ALL_COMBAT_HUDS'].includes(sub) ||
           enemyCaptureActive.value ||
           battleStore.isSearching
  })

  /**
   * Determina si el HUD del jugador debe estar oculto.
   * Totalmente independiente de lo que le pase al enemigo.
   */
  const isPlayerHudSuppressed = computed(() => {
    const state = unwrap(battleStore.fsm?.currentState)
    const sub = unwrap(battleStore.fsm?.currentSubState)
    // El HUD se muestra durante el llamado (POKEMON_CALL) según el manual
    if (sub === 'POKEMON_CALL' || sub === 'SHOW_PLAYER_COMBAT_HUD') {
      return false
    }

    return state === 'INITIALIZING' ||
           state === 'FIRST_INTRO' ||
           (isIntroInProgress.value && state !== 'REORDER_TEAM') ||
           playerAnimState.value === 'releasing' ||
           playerAnimState.value === 'trapped' ||
           ['HIDE_PLAYER_COMBAT_HUD', 'HIDE_ALL_COMBAT_HUDS'].includes(sub) ||
           (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player') ||
           (battleStore.faintedSides?.has('player') && ['SPRITE_FAINT', 'WAIT_FAINT', 'POKEMON_RECALL'].includes(sub)) ||
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
    
    // 3. Prioridad: Búsqueda / Previsualización (Encuentro Actual)
    if (battleStore.isSearching || battleStore.isFinishing) {
      return enemyRef.value || battleStore.upcomingPokemon
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
