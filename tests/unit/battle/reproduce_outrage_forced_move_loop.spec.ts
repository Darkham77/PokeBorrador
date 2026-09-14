import { describe, it, expect } from 'vitest';
import { resolvePlayerForcedMoveIndex } from '@/logic/battle/helpers/turnMoveValidator';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

describe('Reproduce Outrage / Locked Move Infinite Loop (Tier 1)', () => {
  it('should NOT force move when Showdown request provides all normal moves (not locked by Showdown)', () => {
    const moves: Move[] = [
      { id: 'agility', name: 'Agilidad', pp: 30, maxPP: 30 } as Move,
      { id: 'safeguard', name: 'Velo Sagrado', pp: 25, maxPP: 25 } as Move,
      { id: 'outrage', name: 'Enfado', pp: 16, maxPP: 16 } as Move,
      { id: 'hyperbeam', name: 'Hiperrayo', pp: 5, maxPP: 5 } as Move,
    ];

    const dragonite: Pokemon = {
      uid: 'dragonite-1',
      id: 'dragonite',
      name: 'Dragonite',
      level: 86,
      hp: 279,
      maxHp: 279,
      moves,
      lastMove: { id: 'outrage', name: 'Enfado' } as Move,
      volatileCounters: { lockedmove: 1 }
    } as unknown as Pokemon;

    // Showdown request in turn 2 after hitting a Fairy (or after Outrage ended):
    // Showdown gives ALL 4 moves because the attack failed / lockedmove ended!
    const reqMoves = [
      { id: 'agility', move: 'Agility' },
      { id: 'safeguard', move: 'Safeguard' },
      { id: 'outrage', move: 'Outrage' },
      { id: 'hyperbeam', move: 'Hyper Beam' }
    ];

    // Player requested move 0 (Agility)
    const { finalMoveIndex } = resolvePlayerForcedMoveIndex(dragonite, 0, reqMoves);

    // BUG: Currently resolvePlayerForcedMoveIndex forces index 2 (Outrage) because volatileCounters.lockedmove > 0,
    // overriding the player's choice and ignoring Showdown's multi-move request!
    // EXPECTED: When Showdown provides multiple legal choices (>1), the player's choice MUST NOT be overridden!
    expect(finalMoveIndex).toBe(0);
  });
});
