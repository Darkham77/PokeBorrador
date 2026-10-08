import { getItemById, isItemId, type ItemId } from '@/data/inventory/items';
import type { PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { ItemDiscardAction } from '@/types/inventory/items';
import { ITEM_SELL_REFUND_FACTOR } from '@/logic/constants/items.ts';
import type { useGameStore } from '@/stores/game.ts';

type GameStoreInstance = ReturnType<typeof useGameStore>;

const SELL_ALL_QUANTITY_TOKEN = 999 as const;

export function calculateBagSellTotalGain(bagSellSelected: Record<string, number>): number {
  let total = 0;
  Object.entries(bagSellSelected).forEach(([id, q]) => {
    if (isItemId(id) && typeof q === 'number') {
      const itemInfo = getItemById(id);
      if (itemInfo) total += Math.floor((itemInfo.price || 0) * ITEM_SELL_REFUND_FACTOR) * q;
    }
  });
  return total;
}

export function confirmBagSellAction(
  gameStore: GameStoreInstance,
  bagSellSelected: Record<string, number>
): number | false {
  const selectedEntries = Object.entries(bagSellSelected);
  if (selectedEntries.length === 0) return false;

  const totalGain = calculateBagSellTotalGain(bagSellSelected);
  const inv: Partial<Record<ItemId, number>> = { ...gameStore.state.inventory };

  selectedEntries.forEach(([key, qty]) => {
    if (isItemId(key) && typeof qty === 'number') {
      const current = inv[key] || 0;
      const next = current - qty;
      if (next <= 0) {
        delete inv[key];
      } else {
        inv[key] = next;
      }
    }
  });

  gameStore.state.inventory = { ...inv };
  gameStore.state.money += totalGain;
  gameStore.save();
  return totalGain;
}

export function removeItemAction(gameStore: GameStoreInstance, itemId: ItemId, qty: number = 1): void {
  const inv = gameStore.state.inventory;
  if (!inv || !inv[itemId]) return;

  const REMOVE_ALL_ITEM_QTY_FLAG = 999;
  if (qty === REMOVE_ALL_ITEM_QTY_FLAG) {
    delete inv[itemId];
  } else {
    inv[itemId]! -= qty;
    if (inv[itemId]! <= 0) delete inv[itemId];
  }

  gameStore.state.inventory = { ...inv };
  gameStore.save(false);
}

export function addItemAction(gameStore: GameStoreInstance, itemId: ItemId, qty: number = 1): void {
  if (!itemId) return;
  const inventory = gameStore.state.inventory || {};

  inventory[itemId] = (inventory[itemId] || 0) + qty;
  gameStore.state.inventory = { ...inventory };
  gameStore.save(false);
}

export function sellItemAction(gameStore: GameStoreInstance, itemId: ItemId, qty: number = 1): void {
  const itemInfo = getItemById(itemId);

  const inventoryQty = gameStore.state.inventory[itemId] || 0;
  const sellQty = qty === SELL_ALL_QUANTITY_TOKEN ? inventoryQty : Math.min(qty, inventoryQty);

  const gain = Math.floor((itemInfo.price || 0) * ITEM_SELL_REFUND_FACTOR) * sellQty;

  removeItemAction(gameStore, itemId, sellQty);
  gameStore.state.money += gain;
  gameStore.save(false);
}

export async function processBatchActionHandler(
  gameStore: GameStoreInstance,
  itemMap: Map<ItemId, number>,
  mode: ItemDiscardAction
): Promise<number> {
  let totalGain = 0;
  const inventory = gameStore.state.inventory || {};

  for (const [id, qty] of itemMap.entries()) {
    if (!inventory[id]) continue;

    const actualQty = Math.min(qty, inventory[id]!);

    if (mode === 'sell') {
      const itemInfo = getItemById(id);
      totalGain += Math.floor((itemInfo.price || 0) * ITEM_SELL_REFUND_FACTOR) * actualQty;
    }

    inventory[id]! -= actualQty;
    if (inventory[id]! <= 0) delete inventory[id];
  }

  gameStore.state.inventory = { ...inventory };
  if (mode === 'sell') gameStore.state.money += totalGain;

  await gameStore.save(false);
  return totalGain;
}

export function equipItemAction(
  gameStore: GameStoreInstance,
  itemId: ItemId,
  context: PokemonStorageLocation,
  index: number
): boolean {
  const list = context === 'team' ? gameStore.state.team : gameStore.state.box;
  const pokemon = list[index];
  if (!pokemon) return false;

  const inv = gameStore.state.inventory || {};

  if (pokemon.heldItem) {
    const oldItem = pokemon.heldItem;
    inv[oldItem] = (inv[oldItem] || 0) + 1;
  }

  pokemon.heldItem = itemId;
  if (inv[itemId] !== undefined) {
    inv[itemId]! -= 1;
    if (inv[itemId]! <= 0) delete inv[itemId];
  }

  gameStore.state.inventory = { ...inv };
  gameStore.save();
  return true;
}

export function unequipItemAction(
  gameStore: GameStoreInstance,
  context: PokemonStorageLocation,
  index: number
): ItemId | false {
  const list = context === 'team' ? gameStore.state.team : gameStore.state.box;
  const pokemon = list[index];
  if (!pokemon || !pokemon.heldItem) return false;

  const item = pokemon.heldItem;
  const inv = gameStore.state.inventory || {};

  inv[item] = (inv[item] || 0) + 1;
  pokemon.heldItem = null;

  gameStore.state.inventory = { ...inv };
  gameStore.save();
  return item;
}
