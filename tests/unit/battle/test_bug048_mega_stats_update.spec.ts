import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-048 & BUG-049: Mega & Primal stats update', () => {
  it('should update species name on mega evolution', () => {
    const target = { name: 'Lucario', species: 'Lucario' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-mega',
      parts: ['', '-mega', 'p1a: Lucario', 'Lucario-Mega'],
      line: '|-mega|p1a: Lucario|Lucario-Mega',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(target.species).toBe('Lucario-Mega');
  });
});
