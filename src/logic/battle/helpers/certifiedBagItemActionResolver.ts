import type { ItemId } from '../../../data/inventory/items.ts';
import type { CertifiedBattleTeamSlot } from '../../../types/battle/certifiedBattleActions.ts';
import { ShowdownBattleRunner } from './showdownBattleRunner.ts';

/**
 * Validates that an official bag interaction is precisely the next recorded
 * replay action, then returns the only legal paired Showdown response.
 */
export function requireCertifiedBagItemResponse(
  debug: object,
  itemId: ItemId,
  targetSlot: CertifiedBattleTeamSlot,
): string {
  const entry = ShowdownBattleRunner.requirePendingHistoryEntry(debug);
  if (!entry?.p1GameAction || entry.p1GameAction.kind !== 'bag-item') {
    throw new Error('[CertifiedBagItemAction] The next certified replay entry is not a bag-item action.');
  }
  const action = entry.p1GameAction;
  if (action.itemId !== itemId || action.targetSlot !== targetSlot) {
    throw new Error(`[CertifiedBagItemAction] Visible bag interaction does not match the certified bag action. context=${JSON.stringify({ itemId, targetSlot, certifiedItemId: action.itemId, certifiedTargetSlot: action.targetSlot })}`);
  }
  if (entry.p1Choice !== '' || entry.p2Choice === '') {
    throw new Error(`[CertifiedBagItemAction] Certified bag action has an invalid paired Showdown response. context=${JSON.stringify({ p1Choice: entry.p1Choice, p2Choice: entry.p2Choice })}`);
  }
  return entry.p2Choice;
}
