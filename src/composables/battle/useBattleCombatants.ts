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
    if (battleStore.exitingPlayer) {
      list.push(battleStore.exitingPlayer)
    }
    if (player.value && player.value.uid !== battleStore.exitingPlayer?.uid) {
      list.push(player.value)
    }
    return list
  })

  const enemyCombatants = computed(() => {
    const list: Pokemon[] = []
    const isTrainerOrGym = Boolean(battleStore.state?.isTrainer)
    const fsmState = battleStore.currentFsmState
    const fsmSubState = battleStore.currentSubState ?? (battleStore.fsm ? unref(battleStore.fsm.currentSubState) : null)
    const isPreCombatTrainer = isTrainerOrGym && (
      fsmState === 'SEARCH_PHASE' || 
      fsmState === 'INITIALIZING' ||
      (fsmState === 'FIRST_INTRO' && fsmSubState !== 'POKEMON_CALL')
    )
      
    if (isPreCombatTrainer) {
      return list
    }

    if (battleStore.exitingEnemy) {
      list.push(battleStore.exitingEnemy)
    }
    if (enemy.value) {
      list.push(enemy.value)
    }
    return list
  })

  return {
    playerCombatants,
    enemyCombatants
  }
}
