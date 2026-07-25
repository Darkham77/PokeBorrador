import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-037: turn volatile cleanup only clears p1/p2 slots, not all 4 seats', () => {
  it('should clear volatiles for all active seats (p1a, p1b, p2a, p2b) in doubles on turn token', () => {
    const makeActive = () => ({
      name: 'Pikachu',
      volatileCounters: { protect: 1, flinch: 1 },
    });
    const battle = {
      player: makeActive(),
      playerB: makeActive(),  // second slot in doubles — p1b
      enemy: makeActive(),
      enemyB: makeActive(),   // second slot in doubles — p2b
    };
    const ctx = {
      store: {
        activeBattle: { value: battle },
        addLog: () => {},
      },
      type: 'turn',
      parts: ['', 'turn', '3'],
      line: '|turn|3',
      p: null,
      getPoke: () => null,
      getSide: () => null,
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // All 4 active slots must have their per-turn volatiles cleared
    expect(battle.player.volatileCounters['protect']).toBeUndefined();
    expect(battle.enemy.volatileCounters['protect']).toBeUndefined();
    // p1b and p2b must ALSO be cleared — this is the failing assertion if BUG-037 is present
    expect(battle.playerB.volatileCounters['protect']).toBeUndefined();
    expect(battle.enemyB.volatileCounters['protect']).toBeUndefined();
  });
});
