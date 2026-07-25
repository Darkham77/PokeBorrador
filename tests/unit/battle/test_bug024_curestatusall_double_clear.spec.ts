import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-024: -curestatusall must not create redundant double-clear on active slot', () => {
  it('should not separately set battle.player.status=null when it already cleared it via team loop', async () => {
    const activePlayer = { name: 'Pikachu', status: 'brn' as unknown };
    const playerTeam = [activePlayer, { name: 'Charizard', status: 'psn' as unknown }];
    const battle = {
      player: activePlayer,         // same reference as team[0]
      enemy: null,
      playerTeam,
      enemyTeam: [],
    };
    const store = { activeBattle: { value: battle }, addLog: () => {} };
    const ctx = {
      store,
      type: '-curestatusall',
      parts: ['', '-curestatusall'],
      line: '|-curestatusall',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);

    // All team members must be cured
    expect(playerTeam[0]?.status).toBe('');
    expect(playerTeam[1]?.status).toBe('');
    // active player reference must also be empty string (same object)
    expect(battle.player.status).toBe('');
  });
});
