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
    const isTrainerOrGym = Boolean(battleStore.state?.isTrainer)
    const fsmState = unref(battleStore.currentFsmState)
    const fsmSubState = unref(battleStore.currentSubState) ?? (battleStore.fsm ? unref(battleStore.fsm.currentSubState) : null)
    const isPreCombatTrainer = isTrainerOrGym && (
      fsmState === 'SEARCH_PHASE' || 
      fsmState === 'INITIALIZING' ||
      (fsmState === 'FIRST_INTRO' && fsmSubState !== 'POKEMON_CALL')
    )
      
    if (isPreCombatTrainer) {
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
