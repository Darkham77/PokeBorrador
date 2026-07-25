import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-056: -item resets lastItem', () => {
  it('should clear lastItem when receiving a new item via -item', () => {
    const target = { name: 'Snorlax', item: '', lastItem: 'sitrusberry' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-item',
      parts: ['', '-item', 'p1a: Snorlax', 'Leftovers'],
      line: '|-item|p1a: Snorlax|Leftovers',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(target.item).toBe('Leftovers');
    expect(target.lastItem).toBe('');
  });
});
