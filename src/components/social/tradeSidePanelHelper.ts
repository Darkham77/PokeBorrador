import { getItemById, isItemId, type ItemId } from '@/data/inventory/items';
import { ITEM_TIERS, type Inventory, type ItemTier } from '@/types/inventory/items';

const TRADE_ITEM_TIERS_SET: ReadonlySet<string> = new Set(ITEM_TIERS);

function parseItemTier(value: string | undefined): ItemTier | undefined {
  if (value !== undefined && TRADE_ITEM_TIERS_SET.has(value)) {
    return value as ItemTier;
  }
  return undefined;
}

export interface TradeItemEntry {
  id: ItemId;
  name: string;
  qty: number;
  desc: string;
  sprite: string;
  tier?: ItemTier;
}

export function isTradeGiftMode(isGift: boolean, isFriendSide: boolean): boolean {
  return isGift && isFriendSide;
}

export function resolveTradePokemonButtonText(isFriendSide: boolean): string {
  return isFriendSide ? 'PEDIR POKÉMON' : 'OFRECER POKÉMON';
}

export function resolveTradeCreditsLabel(isFriendSide: boolean): string {
  return isFriendSide ? 'PEDIR CRÉDITOS' : 'OFRECER CRÉDITOS';
}

export function formatTradeMaxMoney(maxMoney: number): string {
  return `MÁX: ₱${maxMoney.toLocaleString()}`;
}

export function getItemQuantity(inventory: Inventory | undefined, itemId: ItemId): number {
  if (!inventory) return 0;
  return inventory[itemId] ?? 0;
}

export function mapInventoryItems(inventory?: Inventory): TradeItemEntry[] {
  if (!inventory) return [];
  return (Object.entries(inventory) as [string, number | undefined][])
    .filter((entry): entry is [ItemId, number] => typeof entry[1] === 'number' && entry[1] > 0 && isItemId(entry[0]))
    .map(([id, qty]) => {
      const dbItem = getItemById(id);
      return {
        id: dbItem.id,
        name: dbItem.name,
        qty,
        desc: dbItem.desc ?? '',
        sprite: dbItem.sprite ?? dbItem.id,
        tier: parseItemTier(dbItem.tier)
      };
    });
}
