import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-026: win token must parse multi-battle "Name1 & Name2" winner format', () => {
  it('should handle multi-battle win token with ally names concatenated', async () => {
    const battle = { playerNames: { Ash: 'player', Red: 'player' }, over: false } as Record<string, unknown>;
    const store = { activeBattle: { value: battle }, addLog: () => {} };

    const ctx = {
      store,
      type: 'win',
      parts: ['', 'win', 'Ash & Red'],
      line: '|win|Ash & Red',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);

    // The win must correctly identify player wins even with "Name & AllyName" compound format
    expect(battle.winnerResult).toBe('player');
    expect(battle.over).toBe(true);
  });
});
