import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |event|', () => {
  it('should parse |event| token without returning false', () => {
    const mockStore = { addLog: () => {} };
    const ctx = { store: mockStore, type: 'event', parts: ['event', 'custom event'], line: '|event|custom event', getPoke: () => null };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
