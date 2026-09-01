import { awaitAnimation } from '@/logic/utils/gsapHelpers'
import gsap from 'gsap'
import { useItemOnPokemon } from '../providers/itemProvider.ts'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { AudioStore } from '@/types/system/stores'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { getItemName, type ItemId } from '@/data/inventory/items'

export interface HealingItemOptions {
  addLog: LogFn;
  audio: AudioStore;
  consumeItem: (itemId: ItemId) => void;
  ctx?: BattleContext;
}

export async function executeHealingItemUsage(
  itemName: ItemId,
  pokemon: Pokemon,
  options: HealingItemOptions
): Promise<{ action: string; pokemon?: Pokemon }> {
  const { addLog, consumeItem, audio, ctx } = options
  const displayName = getItemName(itemName)

  addLog(`Usaste ${displayName}`, 'log-info', 'player')

  const res = useItemOnPokemon(itemName, pokemon) as { success: boolean, message: string, pokemon: Pokemon } | null
  if (res) {
    addLog(`¡${pokemon.name} ${res.message}!`, 'log-info', itemName, 'player')
    consumeItem(itemName)

    const isActive = ctx?.activeBattle?.value?.player?.uid === pokemon.uid
    if (isActive) {
      if (ctx?.animations?.handleHealRequest) {
        await ctx.animations.handleHealRequest({ side: 'player' })
      } else {
        gameBus.emit('PLAY_HEAL', { side: 'player' })
        await awaitAnimation(gsap.delayedCall(0.6, () => {}))
      }
    } else {
      audio.play('heal')
    }

    return { action: 'heal', pokemon: res.pokemon }
  }

  addLog('No tuvo efecto.', 'log-info', pokemon)
  return { action: 'fail' }
}
