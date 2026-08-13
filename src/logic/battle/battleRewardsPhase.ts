import type { BattleContext } from '@/types/battle/battleContext'
import { calculateBattleRewards } from './rewardsDistributor.ts'
import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'
import { incrementRecordKey, addToField } from '@/logic/utils/mapUtils'

function hasExitedBattle(ctx: BattleContext): boolean {
  return ctx.fsm.currentState.value === ctx.BATTLE_STATES.EXIT_BATTLE
}

async function handleStolenResources(ctx: BattleContext, active: NonNullable<BattleContext['activeBattle']['value']>, uiStore: ReturnType<typeof useUIStore>) {
  if (!active.stolenResources) return
  const stolen = active.stolenResources
  if (stolen.money && stolen.money > 0) {
    addToField(ctx.gs.state, 'money', stolen.money)
    ctx.addLog(`¡Recuperaste tu dinero robado! +₽${stolen.money}`, 'log-success', 'player')
    uiStore.notify(`¡Recuperaste ₽${stolen.money}!`, '💰')
  }
  if (stolen.items) {
    try {
      const { getItemById, requireItemId } = await import('@/data/inventory/items')
      for (const [itemId, qty] of Object.entries(stolen.items || {})) {
        if (qty && (qty as number) > 0) {
          incrementRecordKey(ctx.gs.state.inventory, itemId, qty as number)
          
          const validId = requireItemId(itemId)
          const itemDef = getItemById(validId)
          ctx.addLog(`¡Recuperaste tu objeto robado: ${itemDef.name}!`, 'log-success', 'player')
          uiStore.notify(`¡Recuperaste ${qty}x ${itemDef.name}!`, '🎒')
        }
      }
    } catch (err: unknown) {
      console.error('Failed to resolve stolen items:', err)
    }
  }
  delete active.stolenResources
}

function handleHatchTimers(active: NonNullable<BattleContext['activeBattle']['value']>) {
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

export async function processBattleRewardsPhase(ctx: BattleContext, win: boolean, fled: boolean) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const active = ctx.activeBattle.value
  if (!active || hasExitedBattle(ctx)) return

  const uiStore = useUIStore()

  if (win && !fled && !active.rewardsProcessed) {
    active.rewardsProcessed = true
    const isWild = !active.isTrainer && !active.isGym && !active.isPvP
    if (!isWild) {
      ctx.audio.play('victoryTrainer')
    }
    await calculateBattleRewards(ctx)
    if (ctx.activeBattle.value !== active || hasExitedBattle(ctx)) return
    await handleStolenResources(ctx, active, uiStore)
    handleHatchTimers(active)
  }

  if (ctx.activeBattle.value !== active || hasExitedBattle(ctx)) return
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)
}
