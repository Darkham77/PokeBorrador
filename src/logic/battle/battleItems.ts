/**
 * battleItems.ts
 * Logic for using items (balls and healing) in battle.
 * Zero-Timer Policy: All waiting is coordinated via GSAP (awaitAnimation / awaitTween).
 */
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { EventStore, AudioStore, BattleStore } from '@/types/system/stores'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import type { ItemId } from '@/data/inventory/items'
import { executePokeballCatchSequence } from './battleCatchProcessor.ts'
import { executeHealingItemUsage } from './battleHealingItemProcessor.ts'

export interface ItemUsageOptions {
  eventStore: EventStore;
  addLog: LogFn;
  audio: AudioStore;
  consumeItem: (itemId: ItemId) => void;
  fsm?: BattleStore['fsm'];
  ctx?: BattleContext;
  itemId?: ItemId;
}

export async function handleItemUsage(
  itemName: ItemId,
  p: Pokemon,
  e: Pokemon,
  options: ItemUsageOptions
): Promise<{ action: string; pokemon?: Pokemon }> {
  const isBall = itemName.includes('ball') || itemName.includes('bola')

  if (isBall) {
    return executePokeballCatchSequence(itemName, e, options)
  }

  return executeHealingItemUsage(itemName, p, options)
}
