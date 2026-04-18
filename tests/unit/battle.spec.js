/**
 * tests/unit/battle.spec.js
 * Consolidated unit tests for Battle Engine mechanics.
 */
import { describe, it, expect, vi } from 'vitest';
import { calculateDamage, getEffectiveSpeed, getStatMultiplier } from '@/logic/battle/battleEngine';

describe('Battle Engine', () => {
  // Mock Math.random to return 1.0 for deterministic results (max damage roll)
  vi.spyOn(Math, 'random').mockReturnValue(1.0);

  describe('Damage Formula & Stat Stages', () => {
    const attacker = { level: 100, atk: 200, spa: 200, type: 'electric' };
    const defender = { level: 100, def: 100, spd: 100, type: 'normal' };
    const move = { name: 'Rayo', type: 'electric', power: 90, cat: 'special' };

    it('should calculate base special damage correctly', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 0 });
      expect(result.dmg).toBe(229);
    });

    it('should scale damage with attack stages (+2 stages = 2x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 2, defStages: 0 });
      expect(result.dmg).toBe(456);
    });

    it('should scale damage with defense stages (+2 stages = 0.5x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 2 });
      expect(result.dmg).toBe(115);
    });
  });

  describe('Abilities', () => {
    it('Intrépido should hit Ghost types with Normal moves', () => {
      const attacker = { id: 'miltank', type: 'normal', atk: 100, level: 50, ability: 'Intrépido' };
      const defender = { id: 'gastly', type: 'ghost', def: 50, level: 50 };
      const move = { name: 'Pisotón', type: 'normal', power: 65, cat: 'physical' };
      
      const result = calculateDamage(attacker, defender, move);
      expect(result.dmg).toBeGreaterThan(0);
      expect(result.eff).toBe(1);
    });

    it('Sebo should reduce Fire/Ice damage by 50%', () => {
      const attacker = { id: 'charmander', type: 'fire', spa: 100, level: 50 };
      const defender = { id: 'snarlax', type: 'normal', spd: 100, level: 50, ability: 'Sebo' };
      const move = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };
      
      const noSeboResult = calculateDamage(attacker, { ...defender, ability: null }, move);
      const seboResult = calculateDamage(attacker, defender, move);
      
      expect(seboResult.dmg).toBe(Math.floor(noSeboResult.dmg * 0.5));
    });
  });

  describe('Weather', () => {
    const attacker = { level: 50, spa: 100, type: 'fire' };
    const defender = { level: 50, spd: 100, type: 'normal' };
    const move = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };

    it('should boost Fire damage in Sun', () => {
      const noWeather = calculateDamage(attacker, defender, move, { weather: null });
      const sun = calculateDamage(attacker, defender, move, { weather: { type: 'sun', turns: 5 } });
      
      expect(sun.dmg).toBe(92);
    });

    it('should reduce Fire damage in Rain', () => {
      const noWeather = calculateDamage(attacker, defender, move, { weather: null });
      const rain = calculateDamage(attacker, defender, move, { weather: { type: 'rain', turns: 5 } });
      
      expect(rain.dmg).toBe(Math.floor(noWeather.dmg * 0.5));
    });
  });

  describe('Speed Calculation', () => {
    it('Clorofila should double speed in Day/Morning', () => {
      const p = { spe: 50, ability: 'Clorofila' };
      const options = { getStatMultiplier, getDayCycle: () => 'day' };
      expect(getEffectiveSpeed(p, { spe: 0 }, options)).toBe(100);
    });

    it('Paralysis should reduce speed by 50%', () => {
      const p = { spe: 100, status: 'paralyze' };
      const options = { getStatMultiplier };
      expect(getEffectiveSpeed(p, { spe: 0 }, options)).toBe(50);
    });
  });
});
