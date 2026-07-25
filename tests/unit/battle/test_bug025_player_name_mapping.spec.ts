import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-025: player token name→side mapping inverted lookup', () => {
  it('should be able to resolve winnerName to player side correctly', async () => {
    const battle = { playerNames: {} as Record<string, string>, winnerResult: '' };
    const store = { activeBattle: { value: battle }, addLog: () => {} };

    const ctxPlayer = {
      store,
      type: 'player',
      parts: ['', 'player', 'p1', 'Ash'],
      line: '|player|p1|Ash',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctxPlayer);

    // Now simulate a win by Ash
    const ctxWin = {
      store,
      type: 'win',
      parts: ['', 'win', 'Ash'],
      line: '|win|Ash',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctxWin);

    // winnerResult must be 'player' since Ash is mapped to p1 (the player side)
    expect(battle.winnerResult).toBe('player');
  });
});
