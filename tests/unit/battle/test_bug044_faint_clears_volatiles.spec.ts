import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-044: faint clears volatileCounters and boosts', () => {
  it('should clear target volatileCounters when faint event occurs', async () => {
    const target = {
      name: 'Pikachu',
      hp: 50,
      fainted: false,
      volatileCounters: { confusion: 1, substitute: 1 }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'faint',
      parts: ['', 'faint', 'p1a: Pikachu'],
      line: '|faint|p1a: Pikachu',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };

    await handleCoreEvents(ctx as any);
    expect(target.fainted).toBe(true);
    expect(Object.keys(target.volatileCounters).length).toBe(0);
  });
});
