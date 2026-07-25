import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |gen|', () => {
  it('should parse |gen| initialization token without returning false', () => {
    const mockStore = { addLog: () => {} };
    const ctx = {
      store: mockStore,
      type: 'gen',
      parts: ['gen', '9'],
      line: '|gen|9',
      getPoke: () => null,
      turnLogs: []
    };
    const handled = handleMiscEvents(ctx as any);
    expect(handled).toBe(true);
  });
});
