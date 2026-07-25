import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |tier|', () => {
  it('should parse |tier| token without returning false', () => {
    const mockStore = { addLog: () => {} };
    const ctx = { store: mockStore, type: 'tier', parts: ['tier', '[Gen 9] Custom Game'], line: '|tier|[Gen 9] Custom Game', getPoke: () => null };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
