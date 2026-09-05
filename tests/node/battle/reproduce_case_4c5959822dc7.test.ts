import { describe, it, expect } from 'vitest';
import {
  resolveValidMoveChoice,
  type ActiveRequestMove
} from '@/logic/battle/helpers/showdownMoveChoiceHelper.ts';

describe('Bug Reproduction: case-4c5959822dc7 (Single-slot move lock / out of bounds move slot)', () => {
  it('should redirect move 3 to move 1 when Pokemon is locked into a single move (Shadow Force)', () => {
    const shadowForceReq: ActiveRequestMove[] = [
      { id: 'shadowforce', move: 'Shadow Force', disabled: false }
    ];

    // Under the old code, this returns 'move 3' which causes Showdown to reject the turn with
    // "Can't move: Your <mon> doesn't have a move 3".
    // It must return 'move 1'.
    const result = resolveValidMoveChoice('move 3', shadowForceReq);
    expect(result).toBe('move 1');
  });

  it('should redirect any out-of-bounds move slot to the first valid move slot', () => {
    const moves: ActiveRequestMove[] = [
      { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false },
      { id: 'surf', move: 'Surf', pp: 15, disabled: false }
    ];

    // Slot 4 does not exist (Pokemon only has 2 moves). Must resolve to first legal slot ('move 1').
    const result = resolveValidMoveChoice('move 4', moves);
    expect(result).toBe('move 1');
  });

  it('should preserve modifiers when redirecting out-of-bounds or single-slot moves', () => {
    const shadowForceReq: ActiveRequestMove[] = [
      { id: 'shadowforce', move: 'Shadow Force', disabled: false }
    ];

    const result = resolveValidMoveChoice('move 3 terastallize', shadowForceReq);
    expect(result).toBe('move 1 terastallize');
  });
});
