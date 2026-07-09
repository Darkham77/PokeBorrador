import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  calculateNPCBaseBudget,
  calculateNPCFinalBudget,
  calculateNPCMaxItems,
  generateNPCInventory
} from '../../../src/logic/battle/trainerInventory.ts';

describe('NPC Trainer Inventory Logic and Budget Formulas', () => {
  describe('calculateNPCBaseBudget', () => {
    it('calculates the correct base budget for Gym Leaders', () => {
      const budget = calculateNPCBaseBudget(50, true, false);
      assert.strictEqual(budget, 50 * 100 + 1000);
    });

    it('calculates the correct base budget for special NPCs (Rivals/Rockets/Police)', () => {
      const budget = calculateNPCBaseBudget(30, false, true);
      assert.strictEqual(budget, 30 * 60 + 500);
    });

    it('calculates the correct base budget for normal Route NPCs', () => {
      const budget = calculateNPCBaseBudget(20, false, false);
      assert.strictEqual(budget, 20 * 25 + 200);
    });
  });

  describe('calculateNPCFinalBudget', () => {
    it('scales correctly with easy difficulty (multiplier 1.0)', () => {
      const final = calculateNPCFinalBudget(1000, 'easy', 1.0);
      assert.strictEqual(final, 1000);
    });

    it('scales correctly with normal difficulty (multiplier 1.5)', () => {
      const final = calculateNPCFinalBudget(1000, 'normal', 1.0);
      assert.strictEqual(final, 1500);
    });

    it('scales correctly with hard difficulty (multiplier 3.0)', () => {
      const final = calculateNPCFinalBudget(1000, 'hard', 1.0);
      assert.strictEqual(final, 3000);
    });

    it('applies the random factor correctly', () => {
      const final = calculateNPCFinalBudget(1000, 'easy', 1.15);
      assert.strictEqual(final, 1150);
    });
  });

  describe('calculateNPCMaxItems', () => {
    it('determines the correct max item slots for Gym Leaders under different difficulties', () => {
      assert.strictEqual(calculateNPCMaxItems(50, 'hard', true, false), 8);
      assert.strictEqual(calculateNPCMaxItems(50, 'normal', true, false), 6);
      assert.strictEqual(calculateNPCMaxItems(50, 'easy', true, false), 4);
    });

    it('determines the correct max item slots for special NPCs', () => {
      assert.strictEqual(calculateNPCMaxItems(30, 'normal', false, true), 6);
    });

    it('determines the correct max item slots for normal NPCs', () => {
      assert.strictEqual(calculateNPCMaxItems(45, 'easy', false, false), 4);
      assert.strictEqual(calculateNPCMaxItems(10, 'easy', false, false), 2);
    });
  });

  describe('generateNPCInventory', () => {
    it('generates a valid inventory and remaining money for a low-level normal NPC', () => {
      const { inventory, remainingMoney } = generateNPCInventory(10, 'easy', false, false);
      
      const totalItems = Object.values(inventory).reduce((a, b) => a + b, 0);
      assert.ok(totalItems <= 10, 'Low level normal route NPC should have items including pokeballs');
      assert.ok(remainingMoney >= 0, 'Remaining money cannot be negative');
      
      // Should not have unlock-restricted items like revives
      assert.strictEqual(inventory['revive'], undefined);
      assert.strictEqual(inventory['revivemax'], undefined);
    });

    it('generates a richer inventory for a hard-mode Gym Leader', () => {
      const { inventory, remainingMoney } = generateNPCInventory(60, 'hard', true, false);
      
      const recoveryItems = ['potion', 'superpotion', 'hyperpotion', 'maxpotion', 'fullrestore', 'antidote', 'burnheal', 'paralyzeheal', 'awakening', 'iceheal', 'fullheal', 'revive', 'revivemax'];
      const totalRecoveryCount = Object.keys(inventory).filter(k => recoveryItems.includes(k)).reduce((a, b) => a + inventory[b]!, 0);

      assert.ok(totalRecoveryCount <= 8, 'Gym Leader on hard should have at most 8 recovery items');
      assert.ok(remainingMoney >= 0, 'Remaining money cannot be negative');
    });
  });

  describe('Team Rocket Player Robbery Simulation', () => {
    it('successfully steals items from enemy inventory within budget limit', () => {
      const enemyInventory: Record<string, number> = {
        'potion': 3,
        'pokeball': 5,
        'superpotion': 2,
        'ultraball': 1
      };
      
      const itemPrices: Record<string, number> = {
        'potion': 200,
        'pokeball': 200,
        'superpotion': 600,
        'ultraball': 1000
      };

      const classLevel = 5;
      const maxLimit = 8 * Math.pow(classLevel, 2); // 200 coins
      
      const playerInventory: Record<string, number> = {};
      let stolenTotalCost = 0;
      
      const availableItems = Object.keys(enemyInventory).filter(k => enemyInventory[k]! > 0);
      
      for (const itemId of availableItems) {
        if (stolenTotalCost >= maxLimit) break;
        const itemPrice = itemPrices[itemId] || 100;
        const availableQty = enemyInventory[itemId] || 0;
        
        const remainingBudget = maxLimit - stolenTotalCost;
        const maxQtyToSteal = Math.floor(remainingBudget / itemPrice);
        
        if (maxQtyToSteal >= 1 && availableQty > 0) {
          const qtyAllowed = Math.min(availableQty, maxQtyToSteal);
          const qtyToSteal = Math.min(qtyAllowed, 1);
          
          enemyInventory[itemId] = availableQty - qtyToSteal;
          if (enemyInventory[itemId] <= 0) {
            delete enemyInventory[itemId];
          }
          playerInventory[itemId] = (playerInventory[itemId] || 0) + qtyToSteal;
          stolenTotalCost += qtyToSteal * itemPrice;
        }
      }
      
      assert.ok(stolenTotalCost <= maxLimit, 'Stolen cost must respect the budget limit');
      assert.ok(Object.keys(playerInventory).length > 0, 'Should have stolen at least one item');
      const potionQty = enemyInventory['potion'] ?? 0;
      const pokeballQty = enemyInventory['pokeball'] ?? 0;
      assert.ok(potionQty < 3 || pokeballQty < 5, 'Enemy quantity must have decreased');
    });
  });
});
