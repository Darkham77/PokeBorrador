import type { Pokemon } from '../../../../types/pokemon/pokemon.ts'
import type { BattleContext } from '../../../../types/battle/battleContext.ts'
import type { ItemId } from '@/data/inventory/items'

const REVIVE_MIN_HEALTH_RATIO = 0.5
const AI_HEAL_TRIGGER_HP_RATIO = 0.25
const HYPER_POTION_HEAL_AMOUNT = 200
const SUPER_POTION_HEAL_AMOUNT = 50
const POTION_HEAL_AMOUNT = 20

type FXTrigger = (onlySound?: boolean) => Promise<void>

async function tryUseRevive(
  ctx: BattleContext,
  e: Pokemon,
  battleState: NonNullable<BattleContext['activeBattle']['value']>,
  enemyInventory: Record<string, number>,
  npcName: string,
  triggerFXAndSound: FXTrigger
): Promise<boolean> {
  const fainted = (battleState.enemyTeam ?? []).filter((poke): poke is Pokemon => Boolean(poke && poke.hp <= 0))
  if (fainted.length === 0 || e.hp < e.maxHp * REVIVE_MIN_HEALTH_RATIO) return false

  const target = fainted[0]!
  if (enemyInventory['revivemax'] && enemyInventory['revivemax'] > 0) {
    target.hp = target.maxHp
    target.status = ''
    if (--enemyInventory['revivemax'] <= 0) delete enemyInventory['revivemax']
    ctx.addLog(`¡${npcName} usó Revivir Máximo en ${target.name}!`, 'log-enemy', 'enemy_trainer')
    ctx.addLog(`¡${target.name} revivió por completo!`, 'log-info', target, 'enemy')
    await triggerFXAndSound(true)
    return true
  }

  if (enemyInventory['revive'] && enemyInventory['revive'] > 0) {
    target.hp = Math.floor(target.maxHp * REVIVE_MIN_HEALTH_RATIO)
    target.status = ''
    if (--enemyInventory['revive'] <= 0) delete enemyInventory['revive']
    ctx.addLog(`¡${npcName} usó Revivir en ${target.name}!`, 'log-enemy', 'enemy_trainer')
    ctx.addLog(`¡${target.name} revivió con la mitad de su salud!`, 'log-info', target, 'enemy')
    await triggerFXAndSound(true)
    return true
  }

  return false
}

type StatusItem = [ItemId, string, string]
const STATUS_ITEMS: readonly StatusItem[] = [
  ['fullrestore', 'Restaurar Todo', 'curó sus problemas de estado'], // spanish-ok: UI Spanish text localization label
  ['fullheal', 'Cura Total', 'curó sus problemas de estado'], // spanish-ok: UI Spanish text localization label
  ['antidote', 'Antídoto', 'fue curado del envenenamiento'], // spanish-ok: UI Spanish text localization label
  ['burnheal', 'Cura Quemadura', 'fue curado de la quemadura'], // spanish-ok: UI Spanish text localization label
  ['paralyzeheal', 'Antiparaliz', 'fue curado de la parálisis'], // spanish-ok: UI Spanish text localization label
  ['awakening', 'Despertar', 'se despertó'], // spanish-ok: UI Spanish text localization label
  ['iceheal', 'Anticongelante', 'se descongeló'] // spanish-ok: UI Spanish text localization label
]

const STATUS_MATCH: Partial<Record<ItemId, string[]>> = {
  fullrestore: ['par', 'brn', 'psn', 'slp', 'frz', 'tox'],
  fullheal: ['par', 'brn', 'psn', 'slp', 'frz', 'tox'],
  antidote: ['psn', 'tox'],
  burnheal: ['brn'],
  paralyzeheal: ['par'],
  awakening: ['slp'],
  iceheal: ['frz']
}

async function tryUseStatusHeal(
  ctx: BattleContext,
  e: Pokemon,
  battleState: NonNullable<BattleContext['activeBattle']['value']>,
  enemyInventory: Record<string, number>,
  npcName: string,
  triggerFXAndSound: FXTrigger
): Promise<boolean> {
  if (e.hp <= 0 || !e.status) return false

  for (const [itemId, itemName, curedMsg] of STATUS_ITEMS) {
    const statuses = STATUS_MATCH[itemId] ?? []
    if (!statuses.includes(e.status as string)) continue
    if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue

    if (itemId === 'fullrestore') e.hp = e.maxHp
    e.status = ''
    if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId]

    const teamMon = (battleState.enemyTeam ?? []).find(p => p && p.uid === e.uid)
    if (teamMon) {
      teamMon.hp = e.hp
      teamMon.status = e.status
    }

    ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer')
    ctx.addLog(`¡${e.name} ${curedMsg}!`, 'log-info', e, 'enemy')
    await triggerFXAndSound()
    return true
  }

  return false
}

type HealItem = [ItemId, string, number | 'full']
const HEAL_ITEMS: readonly HealItem[] = [
  ['fullrestore', 'Restaurar Todo', 'full'], // spanish-ok: UI Spanish text localization label
  ['maxpotion', 'Poción Máxima', 'full'], // spanish-ok: UI Spanish text localization label
  ['hyperpotion', 'Hiper Poción', HYPER_POTION_HEAL_AMOUNT], // spanish-ok: UI Spanish text localization label
  ['superpotion', 'Súper Poción', SUPER_POTION_HEAL_AMOUNT], // spanish-ok: UI Spanish text localization label
  ['potion', 'Poción', POTION_HEAL_AMOUNT] // spanish-ok: UI Spanish text localization label
]

async function tryUseHpHeal(
  ctx: BattleContext,
  e: Pokemon,
  battleState: NonNullable<BattleContext['activeBattle']['value']>,
  enemyInventory: Record<string, number>,
  npcName: string,
  triggerFXAndSound: FXTrigger
): Promise<boolean> {
  if (e.hp <= 0 || e.hp >= e.maxHp * AI_HEAL_TRIGGER_HP_RATIO) return false

  for (const [itemId, itemName, amount] of HEAL_ITEMS) {
    if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue

    const prev = e.hp
    e.hp = amount === 'full' ? e.maxHp : Math.min(e.maxHp, e.hp + amount)
    if (itemId === 'fullrestore') e.status = ''
    if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId]

    const teamMon = (battleState.enemyTeam ?? []).find(p => p && p.uid === e.uid)
    if (teamMon) {
      teamMon.hp = e.hp
      teamMon.status = e.status
    }

    ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer')
    ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy')
    if (e.hp - prev > 0) {
      await triggerFXAndSound()
      return true
    }
  }

  return false
}

export async function evaluateAndUseItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
  const battleState = ctx.activeBattle.value
  if (!battleState?.enemyInventory) return false

  const enemyInventory = battleState.enemyInventory
  if (!Object.values(enemyInventory).some(qty => qty !== undefined && qty > 0)) return false

  const npcName = battleState.isGym
    ? `Líder ${battleState.trainerName || 'de Gimnasio'}`
    : `${battleState.trainerName || 'Entrenador'}`

  const triggerFXAndSound: FXTrigger = async (onlySound = false) => {
    if (!onlySound) {
      if (ctx.animations?.handleHealRequest) {
        await ctx.animations.handleHealRequest({ side: 'enemy' })
      } else {
        const { gameBus } = await import('../../../events/gameBus')
        gameBus.emit('PLAY_HEAL', { side: 'enemy' })
      }
    } else {
      const audioStore = await import('../../../../stores/audio').then(m => m.useAudioStore())
      audioStore.play('heal')
    }
  }

  if (await tryUseRevive(ctx, e, battleState, enemyInventory, npcName, triggerFXAndSound)) return true
  if (await tryUseStatusHeal(ctx, e, battleState, enemyInventory, npcName, triggerFXAndSound)) return true
  if (await tryUseHpHeal(ctx, e, battleState, enemyInventory, npcName, triggerFXAndSound)) return true

  return false
}
