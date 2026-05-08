
/**
 * @vitest-environment jsdom
 * tests/unit/buffsStore.spec.js
 * Unit tests for the Global Buffs and Timers Store
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBuffsStore } from '@/stores/buffs';
import { useGameStore } from '@/stores/game';

describe('Buffs Store', () => {
  let buffsStore;
  let gameStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    buffsStore = useBuffsStore();
    gameStore = useGameStore();

    // Mock save function so it doesn't trigger side effects
    gameStore.save = vi.fn();
    
    // Setup fake timers for interval testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize without active buffs', () => {
    expect(buffsStore.activeBuffs).toHaveLength(0);
  });

  it('should add a buff and persist to game state', () => {
    buffsStore.addBuff('repel', 600);
    expect(gameStore.state.repelSecs).toBe(600);
    expect(gameStore.save).toHaveBeenCalled();
    expect(buffsStore.activeBuffs).toHaveLength(1);
    expect(buffsStore.activeBuffs[0].id).toBe('repel');
    expect(buffsStore.activeBuffs[0].secs).toBe(600);
  });

  it('should stack buff durations if the same buff is added twice', () => {
    buffsStore.addBuff('repel', 600);
    buffsStore.addBuff('repel', 600);
    expect(gameStore.state.repelSecs).toBe(1200);
  });

  it('should handle incense with extra data (type)', () => {
    buffsStore.addBuff('incense', 1800, 'fire');
    expect(gameStore.state.incenseSecs).toBe(1800);
    expect(gameStore.state.incenseType).toBe('fire');
    expect(buffsStore.activeBuffs[0].name).toBe('💨 Incienso Fuego');
  });

  it('should tick down active buffs over time', () => {
    buffsStore.addBuff('repel', 10);
    buffsStore.addBuff('shiny', 5);
    
    buffsStore.initTick();
    
    // Advance 5 seconds
    vi.advanceTimersByTime(5000);
    
    expect(gameStore.state.repelSecs).toBe(5);
    expect(gameStore.state.shinyBoostSecs).toBe(0); // Expired
    
    expect(buffsStore.activeBuffs).toHaveLength(1); // Only repel remains
  });

  it('should pause timers if a battle is active', () => {
    buffsStore.addBuff('repel', 10);
    
    // Mock active battle
    gameStore.state.battle = { over: false };
    
    buffsStore.initTick();
    
    // Advance 5 seconds
    vi.advanceTimersByTime(5000);
    
    // Timer should not have decreased because battle is active
    expect(gameStore.state.repelSecs).toBe(10);
    
    // Mock battle ending
    gameStore.state.battle.over = true;
    
    // Advance another 5 seconds
    vi.advanceTimersByTime(5000);
    
    // Now it should decrease
    expect(gameStore.state.repelSecs).toBe(5);
  });
});
