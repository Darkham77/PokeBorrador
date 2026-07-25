import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-053: singleturn effects', () => {
  it('should set singleturn volatile counter for protect/roost', () => {
    const target = { name: 'Dragonite', volatileCounters: {} };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-singleturn',
      parts: ['', '-singleturn', 'p1a: Dragonite', 'move: Roost'],
      line: '|-singleturn|p1a: Dragonite|move: Roost',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect((target.volatileCounters as Record<string, number>)['roost']).toBe(1);
  });
});
