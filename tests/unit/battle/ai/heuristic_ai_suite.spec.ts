/**
 * tests/unit/battle/ai/heuristic_ai_suite.spec.ts
 *
 * Consolidated Domain Suite for Heuristic Battle AI:
 * - Heuristic layer decision evaluators (Priority KO, Guaranteed OHKO).
 * - Heuristic AI move sets and O(1) sprite/pre-evolution lookups.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluatePriorityKOLayer,
  evaluateGuaranteedKOLayer,
} from '@/logic/battle/ai/heuristic/heuristicLayerEvaluators';
import type {
  DamageMatchup,
  HeuristicMoveInfo,
  HeuristicPokemonState,
} from '@/logic/battle/ai/heuristic/types';
import { HAZARD_REMOVAL_MOVES } from '@/logic/battle/ai/heuristic/sackOrder';
import { SETUP_MOVES, PRIORITY_MOVES } from '@/logic/constants/encounters';
import { VALID_NPC_SPRITES_SET, isNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { getPreEvolution } from '@/data/pokemon/evolutionData';

describe('Heuristic AI Domain Suite', () => {
  describe('heuristicLayerEvaluators', () => {
    const dummyOppActive = {
      name: 'Charizard',
      species: 'charizard',
      hpPercent: 20,
    } as unknown as HeuristicPokemonState;

    const availableMoves: HeuristicMoveInfo[] = [
      { id: 'quickattack', pp: 20, disabled: false },
      { id: 'thunderbolt', pp: 15, disabled: false },
    ];

    it('selects priority KO move when opponent can be OHKOed by priority', () => {
      const matchup: DamageMatchup = {
        myAttacking: [
          {
            move: 'quickattack',
            attacker: 'pikachu',
            defender: 'charizard',
            minPercent: 30,
            maxPercent: 40,
            isOHKO: true,
            is2HKO: true,
            priority: 1,
          },
        ],
        oppAttacking: [],
      };

      const decision = evaluatePriorityKOLayer(matchup, availableMoves, 100, 90, dummyOppActive);
      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('move');
      expect(decision?.moveId).toBe('quickattack');
    });

    it('selects guaranteed OHKO move when outspeeding', () => {
      const matchup: DamageMatchup = {
        myAttacking: [
          {
            move: 'thunderbolt',
            attacker: 'pikachu',
            defender: 'charizard',
            minPercent: 110,
            maxPercent: 130,
            isOHKO: true,
            is2HKO: true,
            priority: 0,
          },
        ],
        oppAttacking: [],
      };

      const decision = evaluateGuaranteedKOLayer(matchup, availableMoves, true);
      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('move');
      expect(decision?.moveId).toBe('thunderbolt');
    });
  });

  describe('Heuristic AI Sets & Sprite Lookups O(1)', () => {
    describe('Move Sets in Heuristic AI', () => {
      it('should identify hazard removal moves in O(1) set', () => {
        expect(HAZARD_REMOVAL_MOVES.has('rapidspin')).toBe(true);
        expect(HAZARD_REMOVAL_MOVES.has('defog')).toBe(true);
        expect(HAZARD_REMOVAL_MOVES.has('tackle')).toBe(false);
      });

      it('should identify setup boost moves in O(1) set', () => {
        expect(SETUP_MOVES.has('swordsdance')).toBe(true);
        expect(SETUP_MOVES.has('nastyplot')).toBe(true);
        expect(SETUP_MOVES.has('calmmind')).toBe(true);
        expect(SETUP_MOVES.has('scratch')).toBe(false);
      });

      it('should identify priority moves in O(1) set', () => {
        expect(PRIORITY_MOVES.has('extremespeed')).toBe(true);
        expect(PRIORITY_MOVES.has('suckerpunch')).toBe(true);
        expect(PRIORITY_MOVES.has('hyperbeam')).toBe(false);
      });
    });

    describe('NPC Sprite Catalog O(1)', () => {
      it('should validate NPC sprite IDs in O(1)', () => {
        expect(VALID_NPC_SPRITES_SET.has('brock')).toBe(true);
        expect(VALID_NPC_SPRITES_SET.has('misty')).toBe(true);
        expect(isNpcSpriteId('brock')).toBe(true);
        expect(isNpcSpriteId('invalid_sprite_random_xyz')).toBe(false);
      });
    });

    describe('Pre-Evolution Table O(1)', () => {
      it('should resolve pre-evolutions in O(1) through PRE_EVOLUTION_MAP', () => {
        expect(getPreEvolution('ivysaur')).toBe('bulbasaur');
        expect(getPreEvolution('charizard')).toBe('charmeleon');
        expect(getPreEvolution('raichu')).toBe('pikachu');
        expect(getPreEvolution('bulbasaur')).toBeNull();
      });
    });
  });
});
