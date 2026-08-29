import { describe, it, expect } from 'vitest';
import { HAZARD_REMOVAL_MOVES } from '@/logic/battle/ai/heuristic/sackOrder';
import { SETUP_MOVES, PRIORITY_MOVES } from '@/logic/constants/encounters';
import { VALID_NPC_SPRITES_SET, isNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { getPreEvolution } from '@/data/pokemon/evolutionData';

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
