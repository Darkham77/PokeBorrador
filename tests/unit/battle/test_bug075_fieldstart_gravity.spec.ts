import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-075: fieldstart gravity message log', () => {
  it('should format gravity fieldstart log correctly', async () => {
    let logMsg = '';
    const battle = { fieldConditions: {} };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-fieldstart',
      parts: ['', '-fieldstart', 'move: Gravity'],
      line: '|-fieldstart|move: Gravity',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(logMsg).toContain('gravedad');
  });
});
