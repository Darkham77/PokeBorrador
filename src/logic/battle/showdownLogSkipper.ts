/**
 * src/logic/battle/showdownLogSkipper.ts
 *
 * Manages log skipping state (e.g. p2Skip) for Showdown battle logs.
 */

import type { BattleState } from '@/types/battle/battle.ts';

export function updateLogSkippingState(battle: BattleState, type: string | undefined, parts: string[]): boolean {
  if (type === 'turnStart') {
    Reflect.set(battle, 'p2Skip', parts[2] === 'p2Skip=true');
    Reflect.set(battle, 'ignoreEnemyLogs', false);
    return true;
  }

  if (Reflect.get(battle, 'ignoreEnemyLogs')) {
    const isPlayerMove = type === 'move' && (parts[2]?.startsWith('p1a:') || parts[2]?.startsWith('p1:'));
    const isSwitchOrDrag = type === 'switch' || type === 'drag';
    const isTurnOrUpkeep = type === 'turn' || type === 'upkeep' || type === 'win' || type === 'tie';

    if (isPlayerMove || isSwitchOrDrag || isTurnOrUpkeep) {
      Reflect.set(battle, 'ignoreEnemyLogs', false);
    }
  }

  if (
    Reflect.get(battle, 'p2Skip') &&
    type === 'move' &&
    (parts[2]?.startsWith('p2a:') || parts[2]?.startsWith('p2:'))
  ) {
    Reflect.set(battle, 'ignoreEnemyLogs', true);
  }

  return Boolean(Reflect.get(battle, 'ignoreEnemyLogs'));
}
