import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-045: switch/drag clears volatileCounters', () => {
  it('should clear volatileCounters on switching pokemon', () => {
    const target = {
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      volatileCounters: { confusion: 1, taunt: 1 }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Charizard', 'Charizard, L100', '100/100'],
      line: '|switch|p1a: Charizard|Charizard, L100|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };

    handleMiscEvents(ctx as any);
    expect(Object.keys(target.volatileCounters).length).toBe(0);
  });
});
