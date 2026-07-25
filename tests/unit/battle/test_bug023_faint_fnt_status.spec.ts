import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-023: faint sets invalid status fnt', () => {
  it('should NOT set target.status to "fnt" — faint is tracked via fainted flag, not status', async () => {
    const mockPoke = { hp: 10, maxHp: 200, status: null, fainted: false };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'faint',
      parts: ['', 'faint', 'p1a: Pikachu'],
      line: '|faint|p1a: Pikachu',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // faint must only set fainted=true and hp=0; status should remain null or ''
    expect(mockPoke.fainted).toBe(true);
    expect(mockPoke.hp).toBe(0);
    expect(mockPoke.status).not.toBe('fnt');
  });
});
