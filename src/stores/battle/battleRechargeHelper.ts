import type { Ref } from 'vue'
import { nextTick } from 'vue'
import { gsapSleep } from '@/logic/utils/gsapHelpers'
import { logger } from '@/logic/utils/logger'
import type { BattleState } from '@/types/battle/battle'
import type { ItemId } from '@/data/inventory/items'

const MAX_PROCESSING_WAIT_RETRIES = 20 as const
const PROCESSING_WAIT_SLEEP_MS = 20 as const

export async function checkAndAutoRecharge(
  activeBattle: Ref<BattleState | null>,
  isProcessing: Ref<boolean>,
  executeMove: (moveIndex: number) => Promise<void>
): Promise<void> {
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isDeterministicSimulation) return
  if (!activeBattle.value || activeBattle.value.over) return
  const req = activeBattle.value.playerRequest
  if (req && req.active?.[0]?.moves) {
    const moves = req.active[0].moves
    if (moves && moves.length === 1 && moves[0] && moves[0].move === 'Recharge') {
      logger.info('BattleStore', 'Forced recharge detected, waiting for isProcessing to clear...')
      await nextTick()
      let retries = 0
      while (isProcessing.value && retries < MAX_PROCESSING_WAIT_RETRIES) {
        await gsapSleep(PROCESSING_WAIT_SLEEP_MS)
        retries++
      }
      logger.info('BattleStore', 'Auto-submitting executeMove(0) for forced recharge.')
      await executeMove(0)
    }
  }
}

export function consumeInventoryItem(gs: { state?: { inventory?: Record<string, number> } }, itemId: ItemId): void {
  if (gs.state?.inventory?.[itemId]) {
    gs.state.inventory[itemId]!--
    if (gs.state.inventory[itemId]! <= 0) delete gs.state.inventory[itemId]
  }
}
