import { describe, it, expect } from 'vitest';
import {
  resolveValidMoveChoice,
  getFirstValidMoveSlot,
  type ActiveRequestMove
} from '@/logic/battle/helpers/showdownMoveChoiceHelper.ts';

describe('showdownMoveChoiceHelper - Comprehensive Unit Tests', () => {
  describe('resolveValidMoveChoice', () => {
    it('should return falsy/empty choice strings unchanged', () => {
      expect(resolveValidMoveChoice('', [])).toBe('');
      expect(resolveValidMoveChoice(null as unknown as string, [])).toBe(null);
      expect(resolveValidMoveChoice(undefined as unknown as string, [])).toBe(undefined);
    });

    it('should return non-move commands unchanged', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false }
      ];
      expect(resolveValidMoveChoice('switch 2', moves)).toBe('switch 2');
      expect(resolveValidMoveChoice('pass', moves)).toBe('pass');
      expect(resolveValidMoveChoice('default', moves)).toBe('default');
      expect(resolveValidMoveChoice('team 1', moves)).toBe('team 1');
      expect(resolveValidMoveChoice('struggle', moves)).toBe('struggle');
    });

    it('should return valid non-disabled moves with positive PP as-is', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false },
        { id: 'surf', move: 'Surf', pp: 15, disabled: false },
        { id: 'flamethrower', move: 'Flamethrower', pp: 10, disabled: false },
        { id: 'bodyslam', move: 'Body Slam', pp: 20, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 1');
      expect(resolveValidMoveChoice('move 2', moves)).toBe('move 2');
      expect(resolveValidMoveChoice('move 3', moves)).toBe('move 3');
      expect(resolveValidMoveChoice('move 4', moves)).toBe('move 4');
    });

    it('should treat undefined PP as available when not disabled', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 1');
    });

    it('should redirect disabled moves (boolean true) to the first legal move', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 24, disabled: false },
        { id: 'flamethrower', move: 'Flamethrower', pp: 24, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 2');
    });

    it('should redirect disabled moves with string reasons to the first legal move', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 10, disabled: 'Disable' },
        { id: 'surf', move: 'Surf', pp: 0, disabled: true },
        { id: 'flamethrower', move: 'Flamethrower', pp: 15, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 3');
    });

    it('should redirect moves with 0 PP (even if disabled is not boolean true)', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: false },
        { id: 'surf', move: 'Surf', pp: 24, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 2');
    });

    it('should preserve modifier suffixes (terastallize, mega, zmove, dynamax, targets)', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 24, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 1 terastallize', moves)).toBe('move 2 terastallize');
      expect(resolveValidMoveChoice('move 1 mega', moves)).toBe('move 2 mega');
      expect(resolveValidMoveChoice('move 1 zmove', moves)).toBe('move 2 zmove');
      expect(resolveValidMoveChoice('move 1 dynamax', moves)).toBe('move 2 dynamax');
      expect(resolveValidMoveChoice('move 1 1', moves)).toBe('move 2 1');
      expect(resolveValidMoveChoice('move 1 2', moves)).toBe('move 2 2');
    });

    it('should normalize single-move locked/recharge states to move 1', () => {
      const rechargeById: ActiveRequestMove[] = [{ id: 'recharge', disabled: false }];
      const rechargeByName: ActiveRequestMove[] = [{ move: 'Recharge', disabled: false }];
      const shadowForce: ActiveRequestMove[] = [{ id: 'shadowforce', move: 'Shadow Force', disabled: false }];

      expect(resolveValidMoveChoice('move 3', rechargeById)).toBe('move 1');
      expect(resolveValidMoveChoice('move 4', rechargeByName)).toBe('move 1');
      expect(resolveValidMoveChoice('move 3', shadowForce)).toBe('move 1');
      expect(resolveValidMoveChoice('move 2 terastallize', rechargeById)).toBe('move 1 terastallize');
      expect(resolveValidMoveChoice('move 3 terastallize', shadowForce)).toBe('move 1 terastallize');
    });

    it('should return original choice if all moves are disabled or out of PP', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 0, disabled: true }
      ];
      expect(resolveValidMoveChoice('move 1', moves)).toBe('move 1');
      expect(resolveValidMoveChoice('move 2', moves)).toBe('move 2');
    });

    it('should redirect out of bounds move slots to the first legal move slot', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false }
      ];
      expect(resolveValidMoveChoice('move 5', moves)).toBe('move 1');

      const allDisabled: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 0, disabled: true }
      ];
      expect(resolveValidMoveChoice('move 5', allDisabled)).toBe('move 5');
    });

    it('should handle undefined or empty activeMoves gracefully', () => {
      expect(resolveValidMoveChoice('move 1', undefined)).toBe('move 1');
      expect(resolveValidMoveChoice('move 2', [])).toBe('move 2');
    });
  });

  describe('getFirstValidMoveSlot', () => {
    it('should return move 1 when the first move is legal', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false },
        { id: 'surf', move: 'Surf', pp: 24, disabled: false }
      ];
      expect(getFirstValidMoveSlot(moves)).toBe('move 1');
    });

    it('should skip disabled moves and find the first available slot', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 0, disabled: true },
        { id: 'flamethrower', move: 'Flamethrower', pp: 10, disabled: false },
        { id: 'bodyslam', move: 'Body Slam', pp: 20, disabled: false }
      ];
      expect(getFirstValidMoveSlot(moves)).toBe('move 3');
    });

    it('should return default fallback (move 1) when all moves are disabled', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true },
        { id: 'surf', move: 'Surf', pp: 0, disabled: true }
      ];
      expect(getFirstValidMoveSlot(moves)).toBe('move 1');
    });

    it('should support custom fallback string when all moves are disabled', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 0, disabled: true }
      ];
      expect(getFirstValidMoveSlot(moves, 'struggle')).toBe('struggle');
      expect(getFirstValidMoveSlot(moves, 'default')).toBe('default');
    });

    it('should return fallback when activeMoves is undefined or empty', () => {
      expect(getFirstValidMoveSlot(undefined)).toBe('move 1');
      expect(getFirstValidMoveSlot([], 'pass')).toBe('pass');
    });
  });
});
