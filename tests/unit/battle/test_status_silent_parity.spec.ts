import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - Status Message Silent Override', () => {
  it('should respect [silent] flag in -status event', async () => {
    let logCount = 0;
    const mockStore = {
      addLog: () => { logCount++; },
      activeBattle: { value: {} }
    };
    const ctx = {
      store: mockStore,
      type: '-status',
      parts: ['', '-status', 'p1a: Pikachu', 'brn'],
      line: '|-status|p1a: Pikachu|brn|[silent]',
      getPoke: () => ({ name: 'Pikachu' }),
      getSide: () => 'player'
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});
