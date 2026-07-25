import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-055: -enditem sets lastItem', () => {
  it('should store lost item in target.lastItem for Recycle/Harvest mechanics', () => {
    const target = {
      name: 'Snorlax',
      heldItem: 'sitrusberry',
      item: 'sitrusberry',
      lastItem: ''
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-enditem',
      parts: ['', '-enditem', 'p1a: Snorlax', 'Sitrus Berry', '[eat]'],
      line: '|-enditem|p1a: Snorlax|Sitrus Berry|[eat]',
      getPoke: () => target,
      getSide: () => 'player'
    };

    handleMiscEvents(ctx as any);
    expect(target.item).toBe('');
    expect(target.lastItem).toBe('Sitrus Berry');
  });
});
