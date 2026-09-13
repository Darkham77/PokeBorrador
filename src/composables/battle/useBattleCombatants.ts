import { computed, unref, type ComputedRef } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { useBattleStore } from '@/stores/battle/battle'

export function useBattleCombatants(
  battleStore: ReturnType<typeof useBattleStore>,
  player: ComputedRef<Pokemon | null | undefined>,
  enemy: ComputedRef<Pokemon | null | undefined>
) {
  const playerCombatants = computed(() => {
    const list: Pokemon[] = []
    const fsmState = unref(battleStore.currentFsmState)
    if (fsmState === 'CONTEXT_SETUP') {
      return list
    }
    const exiting = unref(battleStore.exitingPlayer)
    if (exiting && exiting.uid) {
      list.push(exiting)
    }
    const current = unref(player)
    if (current && current.uid && current.uid !== exiting?.uid) {
      list.push(current)
    }
    return list
  })

  const enemyCombatants = computed(() => {
    const list: Pokemon[] = []
    const b = battleStore.state
    const isTrainerOrGym = Boolean(b?.isTrainer || b?.isGym || b?.isRival || b?.trainerName)
    const fsmState = unref(battleStore.currentFsmState)
    const fsmSubState = unref(battleStore.currentSubState) ?? (battleStore.fsm ? unref(battleStore.fsm.currentSubState) : null)

    // CANONICAL RULE: In ALL encounters, Seat 2 (Enemy) is strictly EMPTY
    // during CONTEXT_SETUP and INITIALIZING (pre-PRELOAD_COORDS).
    // In trainer/gym/rival encounters, Seat 2 is strictly EMPTY
    // during CONTEXT_SETUP, INITIALIZING, SEARCH_PHASE, and FIRST_INTRO (pre-POKEMON_CALL).
    if (fsmState === 'CONTEXT_SETUP' || fsmState === 'INITIALIZING') {
      return list
    }

    if (isTrainerOrGym) {
      const isPreCallTrainer = (
        fsmState === 'SEARCH_PHASE' ||
        (fsmState === 'FIRST_INTRO' && fsmSubState !== 'POKEMON_CALL')
      )
      if (isPreCallTrainer) {
        return list
      }
    }

    const isBattleOver = Boolean(battleStore.state?.over)
    const isRewardsPhase = fsmState === 'REWARDS_PHASE' || fsmState === 'EXIT_BATTLE'
    const isEnemyFaintedOrDefeated = isRewardsPhase && isBattleOver && !battleStore.state?.isCapture

    if (isEnemyFaintedOrDefeated) {
      return list
    }

    const exiting = unref(battleStore.exitingEnemy)
    if (exiting && exiting.uid) {
      list.push(exiting)
    }
    const current = unref(enemy)
    if (current && current.uid && current.uid !== exiting?.uid) {
      list.push(current)
    }
    return list
  })

  return {
    playerCombatants,
    enemyCombatants
  }
}
