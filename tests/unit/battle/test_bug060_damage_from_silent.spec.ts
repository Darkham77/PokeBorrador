import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-060: -damage from silent flag', () => {
  it('should not add log entry when -damage line includes [silent]', async () => {
    let logCount = 0;
    const victim = { name: 'Pikachu', hp: 100, maxHp: 100 };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => { logCount++; }, animations: null },
      type: '-damage',
      parts: ['', '-damage', 'p1a: Pikachu', '80/100', '[from] recoil', '[silent]'],
      line: '|-damage|p1a: Pikachu|80/100|[from] recoil|[silent]',
      p: null,
      getPoke: () => victim,
      getSide: () => 'player',
      turnLogs: []
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});
