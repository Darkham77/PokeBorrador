import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-054: spikes cap at 3 layers', () => {
  it('should cap spikes layers strictly at 3', async () => {
    const battle = { playerSideConditions: { spikes: { turns: 3 } } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-sidestart',
      parts: ['', '-sidestart', 'p1: Player', 'Spikes'],
      line: '|-sidestart|p1: Player|Spikes',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.playerSideConditions.spikes.turns).toBe(3);
  });
});
