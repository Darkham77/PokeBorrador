import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |bigerror|', () => {
  it('should parse |bigerror| token without returning false', () => {
    const mockStore = { addLog: () => {} };
    const ctx = { store: mockStore, type: 'bigerror', parts: ['bigerror', 'sim exception'], line: '|bigerror|sim exception', getPoke: () => null };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
