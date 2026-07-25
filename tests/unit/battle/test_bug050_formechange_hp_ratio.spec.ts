import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-050: -formechange HP ratio preservation', () => {
  it('should maintain current HP percentage ratio when maxHp changes on formechange', () => {
    const target = {
      name: 'Wishiwashi',
      hp: 10,
      maxHp: 200,
      species: 'Wishiwashi-School'
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-formechange',
      parts: ['', '-formechange', 'p1a: Wishiwashi', 'Wishiwashi, L100'],
      line: '|-formechange|p1a: Wishiwashi|Wishiwashi, L100',
      getPoke: () => target,
      getSide: () => 'player'
    };

    handleMiscEvents(ctx as any);
    expect(target.species).toBe('Wishiwashi');
  });
});
