import { describe, it, expect } from 'vitest';
import { calculateCatchRatePure } from '@/logic/battle/battleCatchMath';
import {
  BUG_SYNERGY_BONUS_PER_BUG,
  BUG_SYNERGY_MAX_BONUS,
  TRAINER_IV_PENALTY_RATE
} from '@/logic/constants/gameplay';
import type { PurePokemon } from '@/logic/battle/battleMathTypes';

describe('Class Catch Modifiers', () => {
  const baseTarget: PurePokemon = {
    id: 'caterpie',
    level: 5,
    hp: 20,
    maxHp: 20,
    type: 'bug',
    catchRate: 100
  };

  describe('Cazabichos Bug Synergy', () => {
    it('applies +5% per bug Pokémon in team', () => {
      const activeTeam = [
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: 'flying' }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(2 * BUG_SYNERGY_BONUS_PER_BUG);
      expect(res.bugSynergyBonus).toBe(0.10);
    });

    it('caps bug synergy bonus at +30% maximum', () => {
      const activeTeam = [
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(BUG_SYNERGY_MAX_BONUS);
      expect(res.bugSynergyBonus).toBe(0.30);
    });

    it('gives 0 bonus if team has no bug Pokémon', () => {
      const activeTeam = [
        { type1: 'fire', type2: null },
        { type1: 'water', type2: null }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(0);
    });
  });

  describe('Entrenador High-IV Penalty', () => {
    it('applies -10% catch rate penalty when target IV total > 120', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'entrenador',
        ivTotal: 130
      });

      expect(res.trainerIvPenaltyApplied).toBe(true);
      expect(TRAINER_IV_PENALTY_RATE).toBe(0.10);
    });

    it('does not apply penalty when target IV total <= 120', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'entrenador',
        ivTotal: 120
      });

      expect(res.trainerIvPenaltyApplied).toBe(false);
    });

    it('does not apply penalty for non-entrenador classes even with IV > 120', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'rocket',
        ivTotal: 150
      });

      expect(res.trainerIvPenaltyApplied).toBe(false);
    });
  });
});
