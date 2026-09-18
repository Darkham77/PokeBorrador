import { computed, unref, type ComputedRef } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { useBattleStore } from '@/stores/battle/battle'

function collectActiveCombatants(
  exiting: Pokemon | null | undefined,
  current: Pokemon | null | undefined
): Pokemon[] {
  const list: Pokemon[] = []
  if (exiting && exiting.uid) {
    list.push(exiting)
  }
  if (current && current.uid && current.uid !== exiting?.uid) {
    list.push(current)
  }
  return list
}

function shouldHideEnemyCombatant(battleStore: ReturnType<typeof useBattleStore>): boolean {
  const fsmState = unref(battleStore.currentFsmState)
  if (fsmState === 'CONTEXT_SETUP' || fsmState === 'INITIALIZING') {
    return true
  }

  const b = battleStore.state
  const isTrainerOrGym = Boolean(b?.isTrainer || b?.isGym || b?.isRival || b?.isPvP)
  const fsmSubState = unref(battleStore.currentSubState) ?? (battleStore.fsm ? unref(battleStore.fsm.currentSubState) : null)

  if (isTrainerOrGym) {
    const isPreCallTrainer = fsmState === 'SEARCH_PHASE' || (fsmState === 'FIRST_INTRO' && fsmSubState !== 'POKEMON_CALL')
    if (isPreCallTrainer) {
      return true
    }
  }

  const isBattleOver = Boolean(battleStore.state?.over)
  const isRewardsPhase = fsmState === 'REWARDS_PHASE' || fsmState === 'EXIT_BATTLE'
  return Boolean(isRewardsPhase && isBattleOver && !battleStore.state?.isCapture)
}

export function useBattleCombatants(
  battleStore: ReturnType<typeof useBattleStore>,
  player: ComputedRef<Pokemon | null | undefined>,
  enemy: ComputedRef<Pokemon | null | undefined>
) {
  const playerCombatants = computed(() => {
    const fsmState = unref(battleStore.currentFsmState)
    if (fsmState === 'CONTEXT_SETUP') {
      return []
    }
    return collectActiveCombatants(unref(battleStore.exitingPlayer), unref(player))
  })

  const enemyCombatants = computed(() => {
    if (shouldHideEnemyCombatant(battleStore)) {
      return []
    }
    return collectActiveCombatants(unref(battleStore.exitingEnemy), unref(enemy))
  })

  return {
    playerCombatants,
    enemyCombatants
  }
}
