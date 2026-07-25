import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-063: sidestart toxicspikes 2 layers cap', () => {
  it('should cap toxicspikes strictly at 2 layers', async () => {
    const battle = { playerSideConditions: { toxicspikes: { turns: 2 } } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-sidestart',
      parts: ['', '-sidestart', 'p1: Player', 'move: Toxic Spikes'],
      line: '|-sidestart|p1: Player|move: Toxic Spikes',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.playerSideConditions.toxicspikes.turns).toBe(2);
  });
});
