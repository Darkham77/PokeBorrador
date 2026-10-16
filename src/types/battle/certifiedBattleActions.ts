import { isItemId, type ItemId } from '../../data/inventory/items.ts';

export const CERTIFIED_BATTLE_TEAM_SLOTS = [1, 2, 3, 4, 5, 6] as const;
export type CertifiedBattleTeamSlot = (typeof CERTIFIED_BATTLE_TEAM_SLOTS)[number];

export const CERTIFIED_BATTLE_GAME_ACTION_KINDS = ['bag-item'] as const;
export type CertifiedBattleGameActionKind = (typeof CERTIFIED_BATTLE_GAME_ACTION_KINDS)[number];

export interface CertifiedBattleGameAction {
  readonly kind: 'bag-item';
  readonly itemId: ItemId;
  readonly targetSlot: CertifiedBattleTeamSlot;
}

export function requireCertifiedBattleTeamSlot(value: number): CertifiedBattleTeamSlot {
  const slot = CERTIFIED_BATTLE_TEAM_SLOTS.find((candidate) => candidate === value);
  if (slot !== undefined) return slot;
  throw new Error(`[CertifiedBattleGameAction] Invalid team slot: ${value}.`);
}

function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function isCertifiedBattleGameAction(value: unknown): value is CertifiedBattleGameAction {
  if (!isRecord(value) || Reflect.get(value, 'kind') !== 'bag-item') return false;
  const itemId = Reflect.get(value, 'itemId');
  const targetSlot = Reflect.get(value, 'targetSlot');
  return (
    typeof itemId === 'string' &&
    isItemId(itemId) &&
    CERTIFIED_BATTLE_TEAM_SLOTS.some((slot) => slot === targetSlot)
  );
}
