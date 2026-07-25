import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |teamsize|', () => {
  it('should parse |teamsize| initialization token without ignoring team size metadata', () => {
    const mockStore = {
      addLog: () => {},
      activeBattle: { value: {} }
    };

    const ctx = {
      store: mockStore,
      type: 'teamsize',
      parts: ['teamsize', 'p1', '6'],
      line: '|teamsize|p1|6',
      p: null,
      getPoke: () => null,
      getSide: () => 'player',
      turnLogs: []
    };

    const handled = handleMiscEvents(ctx as any);

    // Expect teamsize token to be recognized by the bridge
    expect(handled).toBe(true);
  });
});
