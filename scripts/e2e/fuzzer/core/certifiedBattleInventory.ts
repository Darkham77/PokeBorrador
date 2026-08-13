import type { ItemId } from '../../../../src/data/inventory/items.ts';

export type CertifiedBattleInventory = Readonly<Partial<Record<ItemId, number>>>;

export function createCertifiedBattleInventory(
  itemIds: readonly ItemId[],
  quantity: number,
): CertifiedBattleInventory {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(`[E2E-CERTIFICATION] Invalid certified inventory quantity: ${quantity}.`);
  }

  const inventory: Partial<Record<ItemId, number>> = {};
  for (const itemId of itemIds) {
    inventory[itemId] = quantity;
  }
  return inventory;
}
