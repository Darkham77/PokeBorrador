import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-070: sethp maxHp zero handling', () => {
  it('should not divide by zero when maxHp is set to zero in sethp token', async () => {
    const target = { name: 'Shedinja', hp: 1, maxHp: 1 };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-sethp',
      parts: ['', '-sethp', 'p1a: Shedinja', '1/0'],
      line: '|-sethp|p1a: Shedinja|1/0',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(target.maxHp).toBeGreaterThan(0);
  });
});
