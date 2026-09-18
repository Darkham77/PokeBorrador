import { watch, toValue, type ComputedRef } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useModalStore } from '@/stores/modals'
import { DEFAULT_MINIGAME_RARITY } from '@/logic/constants/gameplay'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState } from '@/types/battle/battle'
import { isFishingDifficultyKey, type FishingDifficultyKey } from '@/components/modals/fishingGameHelper'
import type { useBattleStore } from '@/stores/battle/battle'
import { getActiveMinigame } from '@/logic/battle/battleMinigames'
import { postBattleCoordinator } from '@/logic/battle/postBattleSequenceCoordinator'

export interface BattleArenaCoordinatorParams {
  battleStore: ReturnType<typeof useBattleStore>
  battle: ComputedRef<BattleState | null | undefined>
  enemy: ComputedRef<Pokemon | null | undefined>
  resetAll: () => void
  handleFishingSuccess: (difficulty?: FishingDifficultyKey) => void | Promise<void>
  handleFishingFail: (data?: unknown) => void | Promise<void>
  handleArchaeologySuccess: (difficulty: string) => void | Promise<void>
  handleArchaeologyFail: (data?: unknown) => void | Promise<void>
  handleMinigameCancel: () => void | Promise<void>
}

export function handleRewardsReset(
  newState: string | null | undefined,
  newSubState: string | null | undefined,
  resetAll: () => void,
  battleStore: ReturnType<typeof useBattleStore>
): void {
  if (newState === 'REWARDS_PHASE' && newSubState === 'EMPTY_WAIT') {
    logger.info('BattleArenaView', '-> EMPTY_WAIT (REWARDS_PHASE)')
    resetAll()

    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  }
}

async function triggerMinigameModal(
  targetEnemy: Pokemon,
  battleState: BattleState | null | undefined,
  callbacks: {
    handleFishingSuccess: (difficulty?: FishingDifficultyKey) => void | Promise<void>
    handleFishingFail: (data?: unknown) => void | Promise<void>
    handleArchaeologySuccess: (difficulty: string) => void | Promise<void>
    handleArchaeologyFail: (data?: unknown) => void | Promise<void>
    handleMinigameCancel: () => void | Promise<void>
  }
): Promise<void> {
  const modalStore = useModalStore()
  const activeMinigame = getActiveMinigame(battleState)
  const rarity = battleState?.rarity || DEFAULT_MINIGAME_RARITY

  if (activeMinigame === 'fishing') {
    if (!modalStore.isOpen('Fishing')) modalStore.open('Fishing', {
      pokemon: targetEnemy,
      rarity,
      onWin: (difficulty?: string) => callbacks.handleFishingSuccess(isFishingDifficultyKey(difficulty) ? difficulty : undefined),
      onFail: callbacks.handleFishingFail,
      onCloseCallback: callbacks.handleMinigameCancel
    })
  } else if (activeMinigame === 'archaeology') {
    if (!modalStore.isOpen('Archaeology')) modalStore.open('Archaeology', {
      pokemon: targetEnemy,
      rarity,
      onWin: (difficulty: string) => callbacks.handleArchaeologySuccess(difficulty),
      onFail: callbacks.handleArchaeologyFail,
      onCloseCallback: callbacks.handleMinigameCancel
    })
  }
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
    () => [toValue(battleStore.currentFsmState), toValue(battleStore.currentSubState)],
    async ([newState, newSubState]) => {
      logger.debug('BattleArenaView', `FSM: ${newState} ${newSubState || ''}`)
      if (!newState) return

      if (newState === 'FIRST_INTRO') {
        logger.info('BattleArenaView', 'Phase: FIRST_INTRO')
      }

      handleRewardsReset(newState, newSubState, resetAll, battleStore)

      const targetEnemy = enemy.value || battle.value?.enemy || battle.value?._initialEnemy
      if (newSubState === 'MINIGAME_CHECK' && targetEnemy) {
        if (postBattleCoordinator.isBusy()) {
          logger.info('BattleArenaView', 'Waiting for postBattleCoordinator before launching minigame...')
          await postBattleCoordinator.waitUntilIdle()
        }
        if (toValue(battleStore.currentSubState) !== 'MINIGAME_CHECK') return

        await triggerMinigameModal(targetEnemy, battle.value, {
          handleFishingSuccess,
          handleFishingFail,
          handleArchaeologySuccess,
          handleArchaeologyFail,
          handleMinigameCancel
        })
      }
    },
    { immediate: true }
  )
}
