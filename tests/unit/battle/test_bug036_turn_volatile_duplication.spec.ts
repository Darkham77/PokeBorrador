import { describe, it, expect } from 'vitest';

// BUG-036: clearTurnVolatiles lambda is duplicated inside 'turn' and 'upkeep' handlers.
// This test verifies that the same logic is NOT duplicated — if it is, a future change to one
// path will silently diverge from the other, causing split behavior.

describe('Audit Parity - BUG-036: clearTurnVolatiles logic must not be duplicated in turn/upkeep', () => {
  it('clearTurnVolatiles must behave identically for turn and upkeep tokens', async () => {
    // We import the module and call both paths
    const { handleMiscEvents } = await import('@/logic/battle/showdownBridgeMisc');

    const makeMon = () => ({
      name: 'Pikachu',
      volatileCounters: { protect: 1, flinch: 1, endure: 1, confusion: 1 },
    });

    const makeCtx = (type: string) => ({
      store: {
        activeBattle: { value: { player: makeMon(), enemy: makeMon() } },
        addLog: () => {},
      },
      type,
      parts: ['', type, '5'],
      line: `|${type}|5`,
      p: null,
      getPoke: () => null,
      getSide: () => null,
    });

    const ctxTurn = makeCtx('turn') as unknown as Parameters<typeof handleMiscEvents>[0];
    const ctxUpkeep = makeCtx('upkeep') as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctxTurn);
    const turnResult = (ctxTurn.store.activeBattle.value as unknown as Record<string, unknown>);

    handleMiscEvents(ctxUpkeep);
    const upkeepResult = (ctxUpkeep.store.activeBattle.value as unknown as Record<string, unknown>);

    // Both paths must clear the same keys — if one path misses a key the other handles, it's a bug
    const playerTurnCounters = (turnResult.player as { volatileCounters: Record<string, unknown> }).volatileCounters;
    const playerUpkeepCounters = (upkeepResult.player as { volatileCounters: Record<string, unknown> }).volatileCounters;

    expect(playerTurnCounters).toEqual(playerUpkeepCounters);
    // 'confusion' must NOT be cleared (not a per-turn volatile in this batch)
    expect(playerTurnCounters['confusion']).toBe(1);
    // protect/flinch/endure MUST be cleared
    expect(playerTurnCounters['protect']).toBeUndefined();
    expect(playerTurnCounters['flinch']).toBeUndefined();
    expect(playerTurnCounters['endure']).toBeUndefined();
  });
});
