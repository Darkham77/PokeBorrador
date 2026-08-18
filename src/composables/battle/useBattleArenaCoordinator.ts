import { watch, type ComputedRef } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useModalStore } from '@/stores/modals'
import { DEFAULT_MINIGAME_RARITY } from '@/logic/constants/gameplay'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState } from '@/types/battle/battle'
import type { useBattleStore } from '@/stores/battle/battle'

export interface BattleArenaCoordinatorParams {
  battleStore: ReturnType<typeof useBattleStore>
  battle: ComputedRef<BattleState | null | undefined>
  enemy: ComputedRef<Pokemon | null | undefined>
  resetAll: () => void
  handleFishingSuccess: (data?: unknown) => void | Promise<void>
  handleFishingFail: (data?: unknown) => void | Promise<void>
  handleArchaeologySuccess: (difficulty: string) => void | Promise<void>
  handleArchaeologyFail: (data?: unknown) => void | Promise<void>
  handleMinigameCancel: () => void | Promise<void>
}

export function useBattleArenaCoordinator(params: BattleArenaCoordinatorParams) {
  const {
    battleStore,
    battle,
    enemy,
    resetAll,
    handleFishingSuccess,
    handleFishingFail,
    handleArchaeologySuccess,
    handleArchaeologyFail,
    handleMinigameCancel
  } = params

  watch(
    () => {
      const fsm = battleStore.fsm
      if (!fsm) return [null, null]
      return [fsm.currentState, fsm.currentSubState]
    },
    async ([newState, newSubState]) => {
      logger.debug('BattleArenaView', `FSM: ${newState} ${newSubState || ''}`)
      if (!newState) return

      if (newState === 'FIRST_INTRO') {
        logger.info('BattleArenaView', 'Phase: FIRST_INTRO')
      }

      if (newState === 'REWARDS_PHASE' && newSubState === 'EMPTY_WAIT') {
        logger.info('BattleArenaView', '-> EMPTY_WAIT (REWARDS_PHASE)')
        resetAll()

        battleStore.attackerSide = null
        battleStore.activeMove = null
        battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
      }

      if (newSubState === 'MINIGAME_CHECK' && enemy.value) {
        const modalStore = useModalStore()
        if (battleStore.state?.isFishing) {
          if (!modalStore.isOpen('Fishing')) modalStore.open('Fishing', {
            pokemon: enemy.value,
            rarity: battle.value?.rarity || DEFAULT_MINIGAME_RARITY,
            onWin: handleFishingSuccess,
            onFail: handleFishingFail,
            onCloseCallback: handleMinigameCancel
          })
        } else if (battleStore.state?.isArchaeology) {
          if (!modalStore.isOpen('Archaeology')) modalStore.open('Archaeology', {
            pokemon: enemy.value,
            rarity: battle.value?.rarity || DEFAULT_MINIGAME_RARITY,
            onWin: (difficulty: string) => handleArchaeologySuccess(difficulty),
            onFail: handleArchaeologyFail,
            onCloseCallback: handleMinigameCancel
          })
        }
      }
    },
    { immediate: true }
  )
}
