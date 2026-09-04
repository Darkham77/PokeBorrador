/**
 * tests/node/items/item_time_buffs_lifecycle.test.ts
 *
 * Tier 2 Integration Tests for the Global Buffs Lifecycle (Family 3):
 * - Activation and Store Synchronization
 * - Mutual Tool Exclusions (Pickaxe vs Brush)
 * - Quality Tier Storage (Standard, Good, Super)
 * - Time Jumps, Expiration and State Cleanup
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockLocalStorage } from '../../helpers/debugSetup.ts';
import { useGameStore } from '@/stores/game.ts';
import { useBuffsStore } from '@/stores/battle/buffs.ts';
import { useDebugStore } from '@/stores/debug.ts';
import { registerTimeTools } from '@/stores/debug/sections/timeTools.ts';

describe('Global Buffs Lifecycle (Family 3)', () => {
  beforeEach(() => {
    mockLocalStorage();
    setActivePinia(createPinia());
    const gameStore = useGameStore();
    gameStore.state.starterChosen = true;
    gameStore.state.team = [
      { uid: 'starter-pika', id: 'pikachu', name: 'Pikachu', level: 10, hp: 30, maxHp: 30, moves: [] } as never
    ];
  });

  test('activates reward buffs (Lucky Egg & Amulet Coin) and reflects in activeBuffs', () => {
    const gameStore = useGameStore();
    const buffsStore = useBuffsStore();

    expect(gameStore.state.luckyEggSecs).toBe(0);
    expect(gameStore.state.amuletCoinSecs).toBe(0);

    buffsStore.addBuff('lucky-egg', 1800);
    buffsStore.addBuff('amulet', 3600);

    expect(gameStore.state.luckyEggSecs).toBe(1800);
    expect(gameStore.state.amuletCoinSecs).toBe(3600);

    const activeList = buffsStore.activeBuffs;
    const eggBuff = activeList.find(b => b.id === 'lucky-egg');
    const amuletBuff = activeList.find(b => b.id === 'amulet');

    expect(eggBuff).toBeDefined();
    expect(eggBuff?.secs).toBe(1800);
    expect(amuletBuff).toBeDefined();
    expect(amuletBuff?.secs).toBe(3600);
  });

  test('enforces mutual exclusion between Pickaxe and Brush', () => {
    const gameStore = useGameStore();
    const buffsStore = useBuffsStore();

    // 1. Activate Pickaxe
    buffsStore.addBuff('pickaxe', 1200, 'gold');
    expect(gameStore.state.pickaxeSecs).toBe(1200);
    expect(gameStore.state.pickaxeType).toBe('gold');
    expect(gameStore.state.brushSecs).toBe(0);
    expect(gameStore.state.brushType).toBe(null);

    // 2. Activating Brush must cancel Pickaxe
    buffsStore.addBuff('brush', 1200, 'super');
    expect(gameStore.state.brushSecs).toBe(1200);
    expect(gameStore.state.brushType).toBe('super');
    expect(gameStore.state.pickaxeSecs).toBe(0);
    expect(gameStore.state.pickaxeType).toBe(null);
  });

  test('cleans up tool types when time expires (0 seconds)', () => {
    const gameStore = useGameStore();
    const buffsStore = useBuffsStore();
    const debugStore = useDebugStore();
    registerTimeTools(debugStore);

    buffsStore.addBuff('fishing-rod', 1200, 'super');
    buffsStore.addBuff('repel', 300);
    expect(gameStore.state.fishingRodType).toBe('super');

    // Simulate time forward jump by 1200 seconds
    const advanceCmd = debugStore.tools.find(t => t.command === 'advanceBuffSeconds');
    expect(advanceCmd).toBeDefined();

    advanceCmd?.action(1200 as never);

    expect(gameStore.state.fishingRodSecs).toBe(0);
    expect(gameStore.state.fishingRodType).toBe(null);
    expect(gameStore.state.repelSecs).toBe(0);
  });

  test('supports precise setBuffDuration for imminent expiration testing', () => {
    const gameStore = useGameStore();
    const buffsStore = useBuffsStore();
    const debugStore = useDebugStore();
    registerTimeTools(debugStore);

    buffsStore.addBuff('repel', 1800);
    expect(gameStore.state.repelSecs).toBe(1800);

    const setDurationCmd = debugStore.tools.find(t => t.command === 'setBuffDuration');
    expect(setDurationCmd).toBeDefined();

    // Fast-forward to 2 seconds remaining
    setDurationCmd?.action('repelSecs' as never, 2 as never);
    expect(gameStore.state.repelSecs).toBe(2);

    // Advance 2 seconds -> should reach 0 and expire
    const advanceCmd = debugStore.tools.find(t => t.command === 'advanceBuffSeconds');
    advanceCmd?.action(2 as never);
    expect(gameStore.state.repelSecs).toBe(0);

    const activeList = buffsStore.activeBuffs;
    const repelBuff = activeList.find(b => b.id === 'item-repel');
    expect(repelBuff).toBeUndefined();
  });
});
