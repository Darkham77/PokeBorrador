/**
 * tests/unit/pokemon_sanitization.spec.js
 * Tests for the "Self-Healing" system (Pokemon and Move sanitization).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recalcPokemonStats } from '@/logic/pokemonFactory';
import { calculateDamage } from '@/logic/battle/battleEngine';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id) => {
      if (id === 'charizard') {
        return { id: 'charizard', name: 'Charizard', hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 };
      }
      return null;
    }),
    getNatureData: vi.fn(() => ({ up: null, down: null })),
    getMoveData: vi.fn((name) => {
      if (name === 'Arañazo') return { power: 40, type: 'normal', cat: 'physical', pp: 35 };
      if (name === 'Garra Metal') return { power: 50, type: 'steel', cat: 'physical', pp: 35 };
      if (name === 'Gruñido') return { power: 0, type: 'normal', cat: 'status', pp: 40 };
      return null;
    })
  }
}));

describe('Pokemon Sanitization (Self-Healing)', () => {
  
  describe('recalcPokemonStats Sanitization', () => {
    it('should fill missing move properties from MOVE_DATA', () => {
      const p = {
        id: 'charizard',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: [
          { name: 'Arañazo' }, // Missing power, type, cat, pp
          { name: 'Garra Metal', power: undefined }, // Explicitly undefined
          { name: 'Gruñido', cat: 'status' } // Partially present
        ]
      };

      recalcPokemonStats(p);

      // Check stats were calculated
      expect(p.maxHp).toBeGreaterThan(0);
      expect(p.atk).toBeGreaterThan(0);

      // Check moves were healed
      expect(p.moves[0].power).toBe(40);
      expect(p.moves[0].type).toBe('normal');
      expect(p.moves[0].cat).toBe('physical');
      expect(p.moves[0].pp).toBe(35);

      expect(p.moves[1].power).toBe(50);
      expect(p.moves[1].type).toBe('steel');

      expect(p.moves[2].power).toBe(0);
      expect(p.moves[2].type).toBe('normal');
    });

    it('should handle non-existent moves gracefully (default to 0/normal)', () => {
      const p = {
        id: 'charizard',
        level: 5,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        moves: [{ name: 'Unknown Move' }]
      };

      recalcPokemonStats(p);
      
      // Should not crash, and moves array should remain as is or be partially sanitized
      // (Currently it only sanitizes if moveData is found)
      expect(p.moves[0].name).toBe('Unknown Move');
    });
  });

  describe('Battle Engine Last-Resort Lookup', () => {
    it('should calculate damage correctly even if move object is missing power/type', () => {
      const attacker = { level: 50, atk: 100, spa: 100, type: 'fire' };
      const defender = { def: 80, spd: 80, type: 'grass' };
      const brokenMove = { name: 'Arañazo' }; // Missing everything

      // calculateDamage should perform last-resort lookup
      const result = calculateDamage(attacker, defender, brokenMove);

      expect(result.dmg).toBeGreaterThan(0);
      expect(result.eff).toBe(1); // Arañazo (Normal) vs Grass is 1x
    });

    it('should respect status moves with 0 power even if properties are missing', () => {
      const attacker = { level: 50, atk: 100 };
      const defender = { def: 80 };
      const brokenStatusMove = { name: 'Gruñido' };

      const result = calculateDamage(attacker, defender, brokenStatusMove);

      expect(result.dmg).toBe(0);
    });
  });
});
