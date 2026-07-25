import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |-zpower|', () => {
  it('should parse |-zpower| token when line lacks p1 prefix', () => {
    const mockStore = { addLog: () => {} };
    const ctx = { store: mockStore, type: '-zpower', parts: ['-zpower', 'p1a: Pikachu'], line: '|-zpower|p1a: Pikachu', getPoke: () => null };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
