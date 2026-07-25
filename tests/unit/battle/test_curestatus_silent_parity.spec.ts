import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - Curestatus Silent Override', () => {
  it('should respect [silent] flag in -curestatus event', async () => {
    let logCount = 0;
    const mockStore = {
      addLog: () => { logCount++; },
      activeBattle: { value: {} }
    };
    const ctx = {
      store: mockStore,
      type: '-curestatus',
      parts: ['', '-curestatus', 'p1a: Pikachu', 'brn'],
      line: '|-curestatus|p1a: Pikachu|brn|[silent]',
      getPoke: () => ({ name: 'Pikachu', status: 'brn' }),
      getSide: () => 'player'
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});
