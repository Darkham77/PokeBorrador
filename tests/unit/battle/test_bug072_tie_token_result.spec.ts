import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-072: tie token result assignment', () => {
  it('should explicitly assign tie result in activeBattle store', async () => {
    const battle = { over: false, winnerResult: 'enemy' };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: 'tie',
      parts: ['', 'tie'],
      line: '|tie',
      getPoke: () => null,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(battle.over).toBe(true);
    expect(battle.winnerResult).toBe('tie');
  });
});
