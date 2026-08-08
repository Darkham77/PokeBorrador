import type { BattleContext } from '@/types/battle/battleContext'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import { CRIMINALITY_GAINED_ON_STEAL } from '@/logic/constants/gameplay'


import type { BattleState } from '@/types/battle/battle'

export async function processRocketStealMechanics(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean,
  trainerName: string,
  battleState: BattleState | null
) {
  // Team Rocket: Robo Rápido
  if (ctx.gs.state.playerClass === 'rocket' && isTrainer && !isGym) {
    const { calculateQuickStealChance, calculateMaxNpcRobberyLimit } = await import('@/logic/player/classMath')
    const level = ctx.classStore.classLevel
    const stealChance = calculateQuickStealChance(level)
    if (Math.random() < stealChance) {
      const maxLimit = calculateMaxNpcRobberyLimit(level)
      const enemyInv = ctx.activeBattle.value?.enemyInventory || {}
      const { getItemById } = await import('@/data/inventory/items')

      const availableItems = Object.keys(enemyInv).filter(k => (enemyInv[k] || 0) > 0)
      if (availableItems.length > 0) {
        let stolenTotalCost = 0
        const stolenItemsList: { id: string; qty: number; name: string }[] = []

        const shuffled = [...availableItems].sort(() => Math.random() - 0.5)
        for (const itemId of shuffled) {
          if (stolenTotalCost >= maxLimit) break

          let itemDef = null
          try {
            itemDef = getItemById(itemId)
          } catch {
            continue
          }
const DEFAULT_ITEM_PRICE_FALLBACK = 100

          const itemPrice = itemDef?.price || DEFAULT_ITEM_PRICE_FALLBACK
          const availableQty = enemyInv[itemId] || 0

          const remainingBudget = maxLimit - stolenTotalCost
          const maxQtyToSteal = Math.floor(remainingBudget / itemPrice)

          if (maxQtyToSteal >= 1 && availableQty > 0) {
            const qtyAllowed = Math.min(availableQty, maxQtyToSteal)
            const qtyToSteal = Math.floor(Math.random() * qtyAllowed) + 1

            enemyInv[itemId] = availableQty - qtyToSteal
            if (enemyInv[itemId] <= 0) {
              delete enemyInv[itemId]
            }

            incrementRecordKey(ctx.gs.state.inventory, itemId, qtyToSteal)

            stolenTotalCost += qtyToSteal * itemPrice
            stolenItemsList.push({ id: itemId, qty: qtyToSteal, name: itemDef?.name || itemId })
          }
        }

        if (stolenItemsList.length > 0) {
          ctx.classStore.addCriminality(CRIMINALITY_GAINED_ON_STEAL)

          const itemsText = stolenItemsList.map(item => `${item.name} x${item.qty}`).join(', ')
          ctx.addLog(`¡Robo Rápido exitoso! Le robaste ${itemsText} a tu oponente.`, 'log-success', 'player')
          ctx.uiStore.notify(`¡Robaste ${itemsText}! (+${CRIMINALITY_GAINED_ON_STEAL} criminalidad)`, '🏴‍☠️')
          ctx.audio.play('steal')
        }
      }
    }
  }

  // Team Rocket ENEMIGO: Robo al jugador
  if (isTrainer && !isGym && battleState?.trainerSprite) {
    const { classifyNpcArchetype } = await import('@/logic/utils/npcSpriteRouter')
    const npcArchetype = classifyNpcArchetype(battleState.trainerSprite || trainerName || '')
    if (npcArchetype === 'rocket') {
      const enemyTeam = ctx.activeBattle.value?.enemyTeam || []
      const avgLevel = enemyTeam.length > 0 
        ? Math.round(enemyTeam.reduce((acc, pl) => acc + (pl.level || 5), 0) / enemyTeam.length)
        : 5

      const { calculateQuickStealChance, calculateMaxNpcRobberyLimit } = await import('@/logic/player/classMath')
      const stealChance = calculateQuickStealChance(avgLevel)
      if (Math.random() < stealChance) {
        const maxLimit = calculateMaxNpcRobberyLimit(avgLevel)
        const playerInventory = ctx.gs.state.inventory || {}

        const { getItemById } = await import('@/data/inventory/items')

        const availableItems = Object.keys(playerInventory).filter(k => {
          if ((playerInventory[k] || 0) <= 0) return false
          try {
            const itemDef = getItemById(k)
            return itemDef && (itemDef.cat === 'potions' || itemDef.cat === 'pokeballs')
          } catch {
            return false
          }
        })

        const itemsLimit = maxLimit * 0.5
        const stolenItems: Record<string, number> = {}

        if (availableItems.length > 0) {
          let stolenTotalCost = 0
          for (const itemId of [...availableItems].sort(() => Math.random() - 0.5)) {
            if (stolenTotalCost >= itemsLimit) break
            const itemDef = getItemById(itemId)
            const itemPrice = itemDef?.price || 100
            const availableQty = playerInventory[itemId] || 0
            if (availableQty > 0 && itemPrice <= (itemsLimit - stolenTotalCost)) {
              const maxQtyAllowed = Math.min(availableQty, Math.floor((itemsLimit - stolenTotalCost) / itemPrice))
              if (maxQtyAllowed >= 1) {
                const qtyToSteal = Math.floor(Math.random() * maxQtyAllowed) + 1
                playerInventory[itemId] = availableQty - qtyToSteal
                incrementRecordKey(stolenItems, itemId, qtyToSteal)
                stolenTotalCost += qtyToSteal * itemPrice
              }
            }
          }
        }

        let stolenTotalCost = Object.entries(stolenItems).reduce((acc, [id, qty]) => acc + (getItemById(id)?.price || 100) * qty, 0)
        
        const remainingLimit = maxLimit - stolenTotalCost
        const playerMoney = ctx.gs.state.money || 0
        const moneyToSteal = Math.min(playerMoney, remainingLimit)

        if (moneyToSteal > 0) {
          ctx.gs.state.money = playerMoney - moneyToSteal
          stolenTotalCost += moneyToSteal
        }

        if (stolenTotalCost > 0) {
          if (ctx.activeBattle.value) {
            ctx.activeBattle.value.stolenResources = {
              money: moneyToSteal,
              items: stolenItems
            }
          }

          ctx.addLog(`¡El Team Rocket te ha emboscado! Te robaron recursos por valor de ₽${stolenTotalCost.toLocaleString()}.`, 'log-error', 'enemy_trainer')

          if (moneyToSteal > 0) {
            ctx.uiStore.notify(`¡Te robaron ₽${moneyToSteal}!`, '💸')
          }

          for (const [itemId, qty] of Object.entries(stolenItems)) {
            let itemDef = null
            try {
              itemDef = getItemById(itemId)
            } catch {
              // usar el ID directamente
            }
            const displayName = itemDef?.name || itemId
            ctx.uiStore.notify(`¡Te robaron ${qty}x ${displayName}!`, '🎒')
          }

          ctx.audio.play('steal')
        }
      }
    }
  }
}
