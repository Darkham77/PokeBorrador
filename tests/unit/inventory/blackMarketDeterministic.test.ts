import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShopStore, getDeterministicDailyBlackMarketItemIds } from '@/stores/inventory/shop';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';

describe('Deterministic Black Market', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ui = useUIStore();
    ui.notify = vi.fn();
  });

  it('generates 100% identical 3 items for the same date string', () => {
    const dateA = '2026-09-12';
    const items1 = getDeterministicDailyBlackMarketItemIds(dateA);
    const items2 = getDeterministicDailyBlackMarketItemIds(dateA);

    expect(items1).toHaveLength(3);
    expect(items2).toEqual(items1);
  });

  it('generates different items for different dates', () => {
    const itemsDay1 = getDeterministicDailyBlackMarketItemIds('2026-09-12');
    const itemsDay2 = getDeterministicDailyBlackMarketItemIds('2026-09-13');

    // Highly probable to differ in either elements or order
    const areIdentical = itemsDay1.every((id, idx) => id === itemsDay2[idx]);
    expect(areIdentical).toBe(false);
  });

  it('applies 20% discount on money price and tracks single daily purchase', () => {
    const gameStore = useGameStore();
    const shopStore = useShopStore();

    gameStore.state.playerClass = 'rocket';
    gameStore.state.money = 1_000_000;
    gameStore.state.inventory = {};

    const items = shopStore.getBlackMarketItems();
    expect(items).toHaveLength(3);

    const firstItem = items[0]!;
    const originalBC = firstItem.bcPrice || 100;
    const expectedPrice = Math.floor((originalBC * 50) * 0.80);

    const initialMoney = gameStore.state.money;
    shopStore.buyBlackMarketItem(firstItem.id);

    expect(gameStore.state.money).toBe(initialMoney - expectedPrice);
    expect(gameStore.state.inventory[firstItem.id]).toBe(1);

    const daily = gameStore.state.classData?.blackMarketDaily;
    expect(daily?.purchased).toContain(firstItem.id);

    // Attempting to buy again should be blocked
    shopStore.buyBlackMarketItem(firstItem.id);
    expect(gameStore.state.money).toBe(initialMoney - expectedPrice); // No extra deduction
    expect(gameStore.state.inventory[firstItem.id]).toBe(1);
  });
});
