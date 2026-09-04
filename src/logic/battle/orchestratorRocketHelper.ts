import type { BattleContext } from '@/types/battle/battleContext'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import { CRIMINALITY_GAINED_ON_STEAL } from '@/logic/constants/gameplay'
import type { BattleState } from '@/types/battle/battle'
import { getItemById, getItemName, isItemId, type ItemId } from '@/data/inventory/items'
import { calculateQuickStealChance, calculateMaxNpcRobberyLimit } from '@/logic/player/classMath'
import { classifyNpcArchetype } from '@/logic/utils/npcSpriteRouter'

const DEFAULT_ITEM_PRICE_FALLBACK = 100
const HALF_FACTOR = 0.5
const DEFAULT_ENEMY_LEVEL = 5

interface StolenItemEntry {
  id: ItemId
  qty: number
  name: string
}

function stealItemsFromEnemy(
  enemyInv: Partial<Record<ItemId, number>>,
  maxLimit: number
): StolenItemEntry[] {
  const availableItems = Object.keys(enemyInv).filter(isItemId).filter(k => (enemyInv[k] || 0) > 0)
  if (availableItems.length === 0) return []

  let stolenTotalCost = 0
  const stolenItemsList: StolenItemEntry[] = []
  const shuffled = [...availableItems].sort(() => Math.random() - HALF_FACTOR)

  for (const itemId of shuffled) {
    if (stolenTotalCost >= maxLimit) break

    let itemDef = null
    try {
      itemDef = getItemById(itemId)
    } catch {
      continue
    }

    const itemPrice = itemDef?.price || DEFAULT_ITEM_PRICE_FALLBACK
    const availableQty = enemyInv[itemId] || 0
    const remainingBudget = maxLimit - stolenTotalCost
    const maxQtyToSteal = Math.floor(remainingBudget / itemPrice)

    if (maxQtyToSteal >= 1 && availableQty > 0) {
      const qtyAllowed = Math.min(availableQty, maxQtyToSteal)
      const qtyToSteal = Math.floor(Math.random() * qtyAllowed) + 1

      enemyInv[itemId] = availableQty - qtyToSteal
      if (enemyInv[itemId]! <= 0) {
        delete enemyInv[itemId]
      }

      stolenTotalCost += qtyToSteal * itemPrice
      const itemName = itemDef ? itemDef.name : itemId
      stolenItemsList.push({ id: itemId, qty: qtyToSteal, name: itemName })
    }
  }

  return stolenItemsList
}

async function executePlayerRocketSteal(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean
): Promise<void> {
  if (ctx.gs.state.playerClass !== 'rocket' || !isTrainer || isGym) return

  const level = ctx.classStore.classLevel
  const stealChance = calculateQuickStealChance(level)
  if (Math.random() >= stealChance) return

  const maxLimit = calculateMaxNpcRobberyLimit(level)
  const enemyInv = ctx.activeBattle.value?.enemyInventory || {}
  const stolenItemsList = stealItemsFromEnemy(enemyInv, maxLimit)

  if (stolenItemsList.length > 0) {
    for (const item of stolenItemsList) {
      incrementRecordKey(ctx.gs.state.inventory, item.id, item.qty)
    }

    ctx.classStore.addCriminality(CRIMINALITY_GAINED_ON_STEAL)
    const itemsText = stolenItemsList.map(item => `${item.name} x${item.qty}`).join(', ')
    ctx.addLog(`¡Robo Rápido exitoso! Le robaste ${itemsText} a tu oponente.`, 'log-success', 'player')
    ctx.uiStore.notify(`¡Robaste ${itemsText}! (+${CRIMINALITY_GAINED_ON_STEAL} criminalidad)`, '🏴‍☠️')
    ctx.audio.play('steal')
  }
}

function stealPotionsAndBallsFromPlayer(
  playerInventory: Partial<Record<ItemId, number>>,
  itemsLimit: number
): Partial<Record<ItemId, number>> {
  const availableItems = Object.keys(playerInventory).filter(isItemId).filter(k => {
    if ((playerInventory[k] || 0) <= 0) return false
    try {
      const itemDef = getItemById(k)
      return itemDef && (itemDef.cat === 'potions' || itemDef.cat === 'pokeballs')
    } catch {
      return false
    }
  })

  const stolenItems: Partial<Record<ItemId, number>> = {}
  if (availableItems.length === 0) return stolenItems

  let stolenTotalCost = 0
  for (const itemId of [...availableItems].sort(() => Math.random() - HALF_FACTOR)) {
    if (stolenTotalCost >= itemsLimit) break
    const itemDef = getItemById(itemId)
    const itemPrice = itemDef?.price || DEFAULT_ITEM_PRICE_FALLBACK
    const availableQty = playerInventory[itemId] || 0
    if (availableQty > 0 && itemPrice <= (itemsLimit - stolenTotalCost)) {
      const maxQtyAllowed = Math.min(availableQty, Math.floor((itemsLimit - stolenTotalCost) / itemPrice))
      if (maxQtyAllowed >= 1) {
        const qtyToSteal = Math.floor(Math.random() * maxQtyAllowed) + 1
        playerInventory[itemId] = availableQty - qtyToSteal
        if (playerInventory[itemId]! <= 0) {
          delete playerInventory[itemId]
        }
        incrementRecordKey(stolenItems, itemId, qtyToSteal)
        stolenTotalCost += qtyToSteal * itemPrice
      }
    }
  }

  return stolenItems
}

async function executeEnemyRocketSteal(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean,
  trainerName: string,
  battleState: BattleState | null
): Promise<void> {
  if (!isTrainer || isGym || !battleState?.trainerSprite) return

  const npcArchetype = classifyNpcArchetype(battleState.trainerSprite || trainerName || '')
  if (npcArchetype !== 'rocket') return

  const enemyTeam = ctx.activeBattle.value?.enemyTeam || []
  const avgLevel = enemyTeam.length > 0
    ? Math.round(enemyTeam.reduce((acc, pl) => acc + (pl.level || DEFAULT_ENEMY_LEVEL), 0) / enemyTeam.length)
    : DEFAULT_ENEMY_LEVEL

  const stealChance = calculateQuickStealChance(avgLevel)
  if (Math.random() >= stealChance) return

  const maxLimit = calculateMaxNpcRobberyLimit(avgLevel)
  const playerInventory = ctx.gs.state.inventory || {}
  const itemsLimit = maxLimit * HALF_FACTOR
  const stolenItems = stealPotionsAndBallsFromPlayer(playerInventory, itemsLimit)

  let stolenTotalCost = (Object.entries(stolenItems) as [ItemId, number][])
    .reduce((acc, [id, qty]) => acc + (getItemById(id)?.price || DEFAULT_ITEM_PRICE_FALLBACK) * qty, 0)

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
        items: stolenItems,
      }
    }

    ctx.addLog(`¡El Team Rocket te ha emboscado! Te robaron recursos por valor de ₽${stolenTotalCost.toLocaleString()}.`, 'log-error', 'enemy_trainer')

    if (moneyToSteal > 0) {
      ctx.uiStore.notify(`¡Te robaron ₽${moneyToSteal}!`, '💸')
    }

    for (const [itemId, qty] of Object.entries(stolenItems)) {
      const displayName = getItemName(itemId)
      ctx.uiStore.notify(`¡Te robaron ${qty}x ${displayName}!`, '🎒')
    }

    ctx.audio.play('steal')
  }
}

export async function processRocketStealMechanics(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean,
  trainerName: string,
  battleState: BattleState | null
): Promise<void> {
  await executePlayerRocketSteal(ctx, isTrainer, isGym)
  await executeEnemyRocketSteal(ctx, isTrainer, isGym, trainerName, battleState)
}
