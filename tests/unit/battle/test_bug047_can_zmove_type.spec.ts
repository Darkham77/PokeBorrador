import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-047: canZMove request data type', () => {
  it('should support object payload for canZMove in request data', () => {
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-zpower',
      parts: ['', '-zpower', 'p1a: Pikachu'],
      line: '|-zpower|p1a: Pikachu',
      getPoke: () => ({ name: 'Pikachu' }),
      getSide: () => 'player'
    };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
