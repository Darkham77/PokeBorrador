import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Unhandled Log Token |-terastallize|', () => {
  it('should parse |-terastallize| token without returning false', () => {
    const mockStore = { addLog: () => {} };
    const ctx = { store: mockStore, type: '-terastallize', parts: ['-terastallize', 'p1a: Pikachu', 'Electric'], line: '|-terastallize|p1a: Pikachu|Electric', getPoke: () => ({ name: 'Pikachu' }) };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});
