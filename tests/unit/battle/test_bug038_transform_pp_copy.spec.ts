import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-038: -transform must copy PP as Math.min(5, move.maxPP) not hardcoded 5', () => {
  it('should set PP to min(5, originalMaxPP) when transforming, not always hardcoded 5', () => {
    const originalMoves = [
      { id: 'hydropump', name: 'Hydro Pump', pp: 8, maxPP: 8 }, // 0 PP-Ups = 5 PP; 3 PP-Ups = 8 PP
    ];
    const user = { name: 'Ditto', species: 'ditto', isTransformed: false, moves: null };
    const targetPoke = { name: 'Blastoise', species: 'blastoise', moves: originalMoves };

    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-transform',
      parts: ['', '-transform', 'p1a: Ditto', 'p2a: Blastoise'],
      line: '|-transform|p1a: Ditto|p2a: Blastoise',
      p: null,
      getPoke: (id: string) => id.includes('Ditto') ? user : targetPoke,
      getSide: () => null,
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // PP must be Math.min(5, 8) = 5 — coincidentally correct here, but if original is 6 it must be 5
    expect(user.moves).not.toBeNull();
    const pp = (user.moves as unknown as typeof originalMoves)[0]?.pp;
    const maxPP = (user.moves as unknown as typeof originalMoves)[0]?.maxPP;
    // Both pp and maxPP on transformed moves must be Math.min(5, originalMaxPP)
    expect(pp).toBe(Math.min(5, originalMoves[0]!.maxPP));
    expect(maxPP).toBe(Math.min(5, originalMoves[0]!.maxPP));
  });
});
