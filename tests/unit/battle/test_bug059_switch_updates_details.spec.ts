import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-059: switch updates details string', () => {
  it('should assign raw details string on switch event', () => {
    const target = { name: 'Pikachu', details: 'Pikachu, L50' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Pikachu', 'Pikachu, L100, M, shiny', '100/100'],
      line: '|switch|p1a: Pikachu|Pikachu, L100, M, shiny|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(target.details).toBe('Pikachu, L100, M, shiny');
  });
});
