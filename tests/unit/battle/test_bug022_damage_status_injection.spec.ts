import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-022: -damage silently applies appended status', () => {
  it('should NOT set status on victim when the HP string contains a status code', async () => {
    const mockPoke = { hp: 150, maxHp: 200, status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {}, animations: null },
      type: '-damage',
      parts: ['', '-damage', 'p1a: Pikachu', '120/200 brn'],
      line: '|-damage|p1a: Pikachu|120/200 brn',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // The status in HP string is informational — only |-status| should set it
    expect(mockPoke.status).toBeNull();
  });
});
