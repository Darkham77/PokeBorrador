import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-021: -heal silently applies appended status', () => {
  it('should NOT set status on target when healing even if status appears in HP string', async () => {
    const mockPoke = { hp: 100, maxHp: 200, status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-heal',
      parts: ['', '-heal', 'p1a: Pikachu', '120/200 brn'],
      line: '|-heal|p1a: Pikachu|120/200 brn',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // A -heal line must NEVER set status — it's informational only
    expect(mockPoke.status).toBeNull();
  });
});
