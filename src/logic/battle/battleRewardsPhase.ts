import type { BattleContext } from '@/types/battle/battleContext'
import { calculateBattleRewards } from './rewardsDistributor.ts'
import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'

export async function processBattleRewardsPhase(ctx: BattleContext, win: boolean, fled: boolean) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const active = ctx.activeBattle.value
  if (!active) return

  const uiStore = useUIStore()

  if (win && !fled && !active.rewardsProcessed) {
    active.rewardsProcessed = true
    const isWild = !active.isTrainer && !active.isGym && !active.isPvP
    if (!isWild) {
      ctx.audio.play('victoryTrainer')
    }
    await calculateBattleRewards(ctx)
    
    // Recuperar recursos robados por el Team Rocket
    if (active.stolenResources) {
      const stolen = active.stolenResources
      if (stolen.money && stolen.money > 0) {
        ctx.gs.state.money = (ctx.gs.state.money || 0) + stolen.money
        ctx.addLog(`¡Recuperaste tu dinero robado! +₽${stolen.money}`, 'log-success', 'player')
        uiStore.notify(`¡Recuperaste ₽${stolen.money}!`, '💰')
      }
      if (stolen.items) {
        const { getItemById } = await import('@/data/inventory/items')
        for (const [itemId, qty] of Object.entries(stolen.items)) {
          if (qty && (qty as number) > 0) {
            if (!ctx.gs.state.inventory) ctx.gs.state.inventory = {}
            ctx.gs.state.inventory[itemId] = (ctx.gs.state.inventory[itemId] || 0) + (qty as number)
            
            let itemDef = null
            try {
              itemDef = getItemById(itemId)
            } catch {
              // usar ID
            }
            const displayName = itemDef?.name || itemId
            ctx.addLog(`¡Recuperaste tu objeto robado: ${displayName}!`, 'log-success', 'player')
            uiStore.notify(`¡Recuperaste ${qty}x ${displayName}!`, '🎒')
          }
        }
      }
      delete active.stolenResources
    }

    try {
      const breedingStore = useBreedingStore()
      if (active.isGym) {
        breedingStore.reduceHatchTimers('gym')
      } else if (active.isCapture) {
        breedingStore.reduceHatchTimers('capture')
      } else {
        breedingStore.reduceHatchTimers('battle')
      }
    } catch (e) {
      console.error('Failed to reduce hatch timers:', e)
    }
  }

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)
}
