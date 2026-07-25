import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-076: start lockedmove counter', () => {
  it('should set lockedmove volatile counter on start lockedmove token', async () => {
    const target = { name: 'OutrageUser', volatileCounters: {} };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: OutrageUser', 'Outrage'],
      line: '|-start|p1a: OutrageUser|Outrage',
      getPoke: () => target,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect((target.volatileCounters as Record<string, number>)['lockedmove']).toBe(1);
  });
});
