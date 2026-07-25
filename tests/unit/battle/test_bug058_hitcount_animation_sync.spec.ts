import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-058: -hitcount animation sync', () => {
  it('should parse -hitcount token correctly and add hit log', () => {
    let logged = false;
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => { logged = true; } },
      type: '-hitcount',
      parts: ['', '-hitcount', 'p2a: Substitute', '3'],
      line: '|-hitcount|p2a: Substitute|3',
      getPoke: () => ({ name: 'Substitute' }),
      getSide: () => 'enemy'
    };
    handleMiscEvents(ctx as any);
    expect(logged).toBe(true);
  });
});
