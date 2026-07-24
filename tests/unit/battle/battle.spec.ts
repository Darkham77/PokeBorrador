/**
 * tests/unit/battle.spec.ts
 * Consolidated unit tests for Battle Engine mechanics.
 */
import { describe, it, expect, vi } from 'vitest';
import { calculateDamage, getEffectiveSpeed } from '@/logic/battle/battleEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';

// Mock day cycle for deterministic results in tests
vi.mock('@/logic/utils/timeUtils', async () => {
  const actual = await vi.importActual('@/logic/utils/timeUtils') as object;
  return {
    ...actual,
    getDayCycle: vi.fn(() => 'day'),
  };
});

describe('Battle Engine', () => {
  // Mock Math.random to return 1.0 for deterministic results (max damage roll)
  vi.spyOn(Math, 'random').mockReturnValue(1.0);

  describe('Damage Formula & Stat Stages', () => {
    const attacker = { level: 100, atk: 200, spa: 200, type: 'electric' } as unknown as Pokemon;
    const defender = { level: 100, def: 100, spd: 100, type: 'normal' } as unknown as Pokemon;
    const move = { name: 'Rayo', type: 'electric', power: 90, cat: 'special' } as const;

    it('should calculate base special damage correctly', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 0 });
      expect(result.dmg).toBe(231);
    });

    it('should scale damage with attack stages (+2 stages = 2x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 2, defStages: 0 });
      expect(result.dmg).toBe(460);
    });

    it('should scale damage with defense stages (+2 stages = 0.5x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 2 });
      expect(result.dmg).toBe(115);
    });
  });

  describe('Abilities', () => {
    it('Intrépido should hit Ghost types with Normal moves', () => {
      const attacker = { id: 'miltank', type: 'normal', atk: 100, level: 50, ability: 'scrappy' } as unknown as Pokemon;
      const defender = { id: 'gastly', type: 'ghost', def: 50, level: 50 } as unknown as Pokemon;
      const move = { name: 'Pisotón', type: 'normal', power: 65, cat: 'physical' } as const;
      
      const result = calculateDamage(attacker, defender, move);
      expect(result.dmg).toBeGreaterThan(0);
      expect(result.eff).toBe(1);
    });

    it('Sebo should reduce Fire/Ice damage by 50%', () => {
      const attacker = { id: 'charmander', type: 'fire', spa: 100, level: 50 } as unknown as Pokemon;
      const defender = { id: 'snarlax', type: 'normal', spd: 100, level: 50, ability: 'thickfat' } as unknown as Pokemon;
      const move = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' } as const;
      
      const noSeboResult = calculateDamage(attacker, { ...defender, ability: null } as unknown as Pokemon, move);
      const seboResult = calculateDamage(attacker, defender, move);
      
      expect(seboResult.dmg).toBe(Math.floor(noSeboResult.dmg * 0.5));
    });
  });

  describe('Weather', () => {
    const attacker = { level: 50, spa: 100, type: 'fire' } as unknown as Pokemon;
    const defender = { level: 50, spd: 100, type: 'normal' } as unknown as Pokemon;
    const move = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' } as const;

    it('should boost Fire damage in Sun', () => {
      calculateDamage(attacker, defender, move, { weather: null });
      const sun = calculateDamage(attacker, defender, move, { weather: { type: 'sun', turns: 5 } });
      
      expect(sun.dmg).toBe(91);
    });

    it('should reduce Fire damage in Rain', () => {
      calculateDamage(attacker, defender, move, { weather: null });
      const rain = calculateDamage(attacker, defender, move, { weather: { type: 'rain', turns: 5 } });
      
      expect(rain.dmg).toBe(30);
    });
  });

  describe('Speed Calculation', () => {
    it('Clorofila should double speed in Day/Morning', () => {
      const p = { spe: 50, ability: 'chlorophyll' } as unknown as Pokemon;
      expect(getEffectiveSpeed(p, { spe: 0 }, { weather: null })).toBe(100);
    });

    it('Paralysis should reduce speed by 50%', () => {
      const p = { spe: 100, status: 'par' } as unknown as Pokemon;
      expect(getEffectiveSpeed(p, { spe: 0 }, { weather: null })).toBe(50);
    });
  });
});
