import type { Pokemon } from '../../../../types/pokemon/pokemon.ts'
import type { BattleContext } from '../../../../types/battle/battleContext.ts'

export async function evaluateAndUseItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
  const battleState = ctx.activeBattle.value
  if (!battleState?.enemyInventory) return false

  const enemyInventory = battleState.enemyInventory
  if (!Object.values(enemyInventory).some(qty => qty !== undefined && qty > 0)) return false

  const npcName = battleState.isGym
    ? `Líder ${battleState.trainerName || 'de Gimnasio'}`
    : `${battleState.trainerName || 'Entrenador'}`

  const triggerFXAndSound = async (onlySound = false) => {
    if (!onlySound) {
      if (ctx.animations?.handleHealRequest) {
        await ctx.animations.handleHealRequest({ side: 'enemy' })
      } else {
        const { gameBus } = await import('../../../events/gameBus')
        gameBus.emit('PLAY_HEAL', { side: 'enemy' })
      }
    }
    const audioStore = await import('../../../../stores/audio').then(m => m.useAudioStore())
    audioStore.play('heal')
  }

  // 1. Revive check
  const fainted = (battleState.enemyTeam ?? []).filter((poke): poke is Pokemon => !!poke && poke.hp <= 0)
  if (fainted.length > 0 && e.hp >= e.maxHp * 0.5) {
    if (enemyInventory['revivemax'] && enemyInventory['revivemax'] > 0) {
      const target = fainted[0]!
      target.hp = target.maxHp
      target.status = ''
      if (--enemyInventory['revivemax'] <= 0) delete enemyInventory['revivemax']
      ctx.addLog(`¡${npcName} usó Revivir Máximo en ${target.name}!`, 'log-enemy', 'enemy_trainer')
      ctx.addLog(`¡${target.name} revivió por completo!`, 'log-info', target, 'enemy')
      await triggerFXAndSound(true)
      return true
    }
    if (enemyInventory['revive'] && enemyInventory['revive'] > 0) {
      const target = fainted[0]!
      target.hp = Math.floor(target.maxHp * 0.5)
      target.status = ''
      if (--enemyInventory['revive'] <= 0) delete enemyInventory['revive']
      ctx.addLog(`¡${npcName} usó Revivir en ${target.name}!`, 'log-enemy', 'enemy_trainer')
      ctx.addLog(`¡${target.name} revivió con la mitad de su salud!`, 'log-info', target, 'enemy')
      await triggerFXAndSound(true)
      return true
    }
  }

  // 2. Status check
  if (e.status) {
    type StatusItem = [string, string, string]
    const statusItems: StatusItem[] = [
      ['fullrestore', 'Restaurar Todo', 'curó sus problemas de estado'],
      ['fullheal', 'Cura Total', 'curó sus problemas de estado'],
      ['antidote', 'Antídoto', 'fue curado del envenenamiento'],
      ['burnheal', 'Cura Quemadura', 'fue curado de la quemadura'],
      ['paralyzeheal', 'Antiparaliz', 'fue curado de la parálisis'],
      ['awakening', 'Despertar', 'se despertó'],
      ['iceheal', 'Anticongelante', 'se descongeló']
    ]
    const statusMatch: Record<string, string[]> = {
      fullrestore: ['par', 'brn', 'psn', 'slp', 'frz', 'tox'],
      fullheal: ['par', 'brn', 'psn', 'slp', 'frz', 'tox'],
      antidote: ['psn', 'tox'],
      burnheal: ['brn'],
      paralyzeheal: ['par'],
      awakening: ['slp'],
      iceheal: ['frz']
    }
    for (const [itemId, itemName, curedMsg] of statusItems) {
      const statuses = statusMatch[itemId] ?? []
      if (!statuses.includes(e.status as string)) continue
      if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue
      if (itemId === 'fullrestore') e.hp = e.maxHp
      e.status = ''
      if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId]
      ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer')
      ctx.addLog(`¡${e.name} ${curedMsg}!`, 'log-info', e, 'enemy')
      await triggerFXAndSound()
      return true
    }
  }

  // 3. HP check
  if (e.hp < e.maxHp * 0.25) {
    type HealItem = [string, string, number | 'full']
    const healItems: HealItem[] = [
      ['fullrestore', 'Restaurar Todo', 'full'],
      ['maxpotion', 'Poción Máxima', 'full'],
      ['hyperpotion', 'Hiper Poción', 200],
      ['superpotion', 'Súper Poción', 50],
      ['potion', 'Poción', 20]
    ]
    for (const [itemId, itemName, amount] of healItems) {
      if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue
      const prev = e.hp
      e.hp = amount === 'full' ? e.maxHp : Math.min(e.maxHp, e.hp + amount)
      if (itemId === 'fullrestore') e.status = ''
      if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId]
      ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer')
      ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy')
      if (e.hp - prev > 0) {
        await triggerFXAndSound()
        return true
      }
    }
  }

  return false
}
