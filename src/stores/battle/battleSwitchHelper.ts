import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isPlayerTrappedInWorker } from '@/logic/battle/orchestrator.ts'
import { executeSwitch as switchAction } from '@/logic/battle/actions/switchAction.ts'
import { logger } from '@/logic/utils/logger.ts'
import { useErrorStore } from '@/stores/errorStore.ts'
import { gameBus } from '@/logic/events/gameBus.ts'

/**
 * Authoritative switch action runner for battleStore.
 */
export async function executeBattleSwitch(
  ctx: BattleContext,
  targetIdentifier: number | string,
  isForced = false
): Promise<void> {
  if (ctx.isProcessing.value && !isForced) return

  if (ctx.isPvP.value) {
    const pvpTeamList = (ctx.activeBattle.value?.playerTeam && ctx.activeBattle.value.playerTeam.length > 0)
      ? ctx.activeBattle.value.playerTeam
      : (ctx.gs.state.team || [])
    const switchIndex = typeof targetIdentifier === 'number'
      ? targetIdentifier
      : pvpTeamList.findIndex((p: Pokemon | null) => p && p.uid === targetIdentifier)
    const validIndex = switchIndex !== -1 ? switchIndex : 0
    gameBus.emit('PVP_COMMIT_PICK', {
      type: 'switch',
      switchIndex: validIndex,
      choiceString: `switch ${validIndex + 1}`
    })
    return
  }

  if (!isForced) {
    const isTrapped = await isPlayerTrappedInWorker()
    if (isTrapped) {
      ctx.uiStore.notify('¡No puedes cambiar de Pokémon ahora! (Atrapado)', '🚫')
      return
    }
  }

  ctx.isProcessing.value = true
  try {
    await switchAction(ctx, targetIdentifier, isForced)
  } catch (error) {
    logger.error('BattleStore', `Error switching pokemon: ${(error as Error).message}`, error)
    ctx.addLog('¡Ocurrió un error al cambiar de Pokémon!', 'log-error', 'player')
    useErrorStore().setError(error, { type: 'Battle Switch Error', source: 'battleStore.executeSwitch' })
  } finally {
    ctx.isProcessing.value = false
  }
}
