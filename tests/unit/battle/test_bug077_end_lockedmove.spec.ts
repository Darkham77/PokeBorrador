import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-077: end lockedmove counter clear', () => {
  it('should remove lockedmove volatile counter on end lockedmove token', async () => {
    const target = { name: 'OutrageUser', volatileCounters: { lockedmove: 1 } };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-end',
      parts: ['', '-end', 'p1a: OutrageUser', 'Outrage'],
      line: '|-end|p1a: OutrageUser|Outrage',
      getPoke: () => target,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(target.volatileCounters['lockedmove']).toBeUndefined();
  });
});
