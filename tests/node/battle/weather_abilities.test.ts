/**
 * tests/node/battle/weather_abilities.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Verifies one-by-one that all weathers affect the implemented abilities and attacks correctly.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDamagePure,
  getAbilityMultiplier,
  getEffectiveStat,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather,
} from '../../../src/logic/battle/battleMath.ts';

describe('Weather & Abilities Integrations (Gen 2 Ruleset)', () => {

  // Fix Math.random for deterministic maximum damage rolls
  mock.method(Math, 'random', () => 1.0);

  const clear:        PureBattleWeather = { type: 'clear', turns: -1 };
  const sun:          PureBattleWeather = { type: 'sun', turns: 5 };
  const rain:         PureBattleWeather = { type: 'rain', turns: 5 };
  const storm:        PureBattleWeather = { type: 'storm', turns: 5 };
  const heavyRain:    PureBattleWeather = { type: 'heavy_rain', turns: 5 };
  const heatwave:     PureBattleWeather = { type: 'heatwave', turns: 5 };
  const snow:         PureBattleWeather = { type: 'snow', turns: 5 };
  const hail:         PureBattleWeather = { type: 'hail', turns: 5 };

  describe('Move Type interaction under extreme climates', () => {
    it('Fire moves should deal 0 damage under Heavy Rain and Storm', () => {
      const attacker: PurePokemon = { level: 100, spa: 200, type: 'fire' };
      const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
      const move: PureMove = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };

      const dmgHeavyRain = calculateDamagePure(attacker, defender, move, { weather: heavyRain });
      const dmgStorm = calculateDamagePure(attacker, defender, move, { weather: storm });
      const dmgRain = calculateDamagePure(attacker, defender, move, { weather: rain });

      assert.strictEqual(dmgHeavyRain.dmg, 0);
      assert.strictEqual(dmgStorm.dmg, 0);
      assert.ok(dmgRain.dmg > 0, 'Standard rain should deal reduced but non-zero damage');
    });

    it('Water moves should deal 0 damage under Heatwave', () => {
      const attacker: PurePokemon = { level: 100, spa: 200, type: 'water' };
      const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
      const move: PureMove = { name: 'Surf', type: 'water', power: 95, cat: 'special' };

      const dmgHeatwave = calculateDamagePure(attacker, defender, move, { weather: heatwave });
      const dmgSun = calculateDamagePure(attacker, defender, move, { weather: sun });

      assert.strictEqual(dmgHeatwave.dmg, 0);
      assert.ok(dmgSun.dmg > 0, 'Standard sun should deal reduced but non-zero water damage');
    });
  });

  describe('Ability: Mar llamas (Blaze)', () => {
    const move: PureMove = { type: 'fire', power: 90, cat: 'special' };

    it('should boost Fire moves by 1.5x at <= 1/3 HP', () => {
      const lowHpAttacker: PurePokemon = { level: 100, hp: 30, maxHp: 100, spa: 200, type: 'fire', ability: 'Mar llamas' };
      const { mult } = getAbilityMultiplier(lowHpAttacker, move, null);
      assert.strictEqual(mult, 1.5);
    });

    it('should NOT boost Fire moves at > 1/3 HP', () => {
      const highHpAttacker: PurePokemon = { level: 100, hp: 80, maxHp: 100, spa: 200, type: 'fire', ability: 'Mar llamas' };
      const { mult } = getAbilityMultiplier(highHpAttacker, move, null);
      assert.strictEqual(mult, 1.0);
    });

    it('Fire moves still deal 0 damage under Heavy Rain even if Mar llamas is active', () => {
      const attacker: PurePokemon = { level: 100, hp: 30, maxHp: 100, spa: 200, type: 'fire', ability: 'Mar llamas' };
      const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
      const dmg = calculateDamagePure(attacker, defender, move, { weather: heavyRain });
      assert.strictEqual(dmg.dmg, 0);
    });
  });

  describe('Ability: Torrente (Torrent)', () => {
    const move: PureMove = { type: 'water', power: 90, cat: 'special' };

    it('should boost Water moves by 1.5x at <= 1/3 HP', () => {
      const attacker: PurePokemon = { level: 100, hp: 30, maxHp: 100, spa: 200, type: 'water', ability: 'Torrente' };
      const { mult } = getAbilityMultiplier(attacker, move, null);
      assert.strictEqual(mult, 1.5);
    });
  });

  describe('Ability: Espesura (Overgrow)', () => {
    const move: PureMove = { type: 'grass', power: 90, cat: 'special' };

    it('should boost Grass moves by 1.5x at <= 1/3 HP', () => {
      const attacker: PurePokemon = { level: 100, hp: 30, maxHp: 100, spa: 200, type: 'grass', ability: 'Espesura' };
      const { mult } = getAbilityMultiplier(attacker, move, null);
      assert.strictEqual(mult, 1.5);
    });
  });

  describe('Ability: Enjambre (Swarm)', () => {
    const move: PureMove = { type: 'bug', power: 90, cat: 'physical' };

    it('should boost Bug moves by 1.5x at <= 1/3 HP', () => {
      const attacker: PurePokemon = { level: 100, hp: 30, maxHp: 100, atk: 200, type: 'bug', ability: 'Enjambre' };
      const { mult } = getAbilityMultiplier(attacker, move, null);
      assert.strictEqual(mult, 1.5);
    });
  });

  describe('Ability: Nado rápido (Swift Swim)', () => {
    const p: PurePokemon = { level: 100, spe: 100, type: 'water', ability: 'Nado rápido' };

    it('should double speed in Rain', () => {
      const speed = getEffectiveStat(p, 'spe', {}, rain);
      assert.strictEqual(speed, 200);
    });

    it('should double speed in Heavy Rain', () => {
      const speed = getEffectiveStat(p, 'spe', {}, heavyRain);
      assert.strictEqual(speed, 200);
    });

    it('should double speed in Storm (extreme rain)', () => {
      const speed = getEffectiveStat(p, 'spe', {}, storm);
      assert.strictEqual(speed, 200);
    });

    it('should NOT double speed in Clear weather', () => {
      const speed = getEffectiveStat(p, 'spe', {}, clear);
      assert.strictEqual(speed, 100);
    });
  });

  describe('Ability: Clorofila (Chlorophyll)', () => {
    const p: PurePokemon = { level: 100, spe: 100, type: 'grass', ability: 'Clorofila' };

    it('should double speed in Sun', () => {
      const speed = getEffectiveStat(p, 'spe', {}, sun);
      assert.strictEqual(speed, 200);
    });

    it('should NOT double speed in Rain', () => {
      const speed = getEffectiveStat(p, 'spe', {}, rain);
      assert.strictEqual(speed, 100);
    });
  });

  describe('Ability: Quitanieves (Slush Rush)', () => {
    const p: PurePokemon = { level: 100, spe: 100, type: 'ice', ability: 'Quitanieves' };

    it('should double speed in Snow/Hail', () => {
      const speedSnow = getEffectiveStat(p, 'spe', {}, snow);
      const speedHail = getEffectiveStat(p, 'spe', {}, hail);
      assert.strictEqual(speedSnow, 200);
      assert.strictEqual(speedHail, 200);
    });
  });

  describe('Ability: Sebo (Thick Fat)', () => {
    const attackerFire: PurePokemon = { level: 100, spa: 200, type: 'fire' };
    const attackerIce:  PurePokemon = { level: 100, spa: 200, type: 'ice' };
    const defender:      PurePokemon = { level: 100, spd: 100, type: 'normal', ability: 'Sebo' };

    it('should reduce Fire-type move damage by 50%', () => {
      const move: PureMove = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };
      const dmgNoSebo = calculateDamagePure(attackerFire, { ...defender, ability: null }, move);
      const dmgSebo = calculateDamagePure(attackerFire, defender, move);
      assert.strictEqual(dmgSebo.dmg, Math.floor(dmgNoSebo.dmg * 0.5));
    });

    it('should reduce Ice-type move damage by 50%', () => {
      const move: PureMove = { name: 'Rayo hielo', type: 'ice', power: 90, cat: 'special' };
      const dmgNoSebo = calculateDamagePure(attackerIce, { ...defender, ability: null }, move);
      const dmgSebo = calculateDamagePure(attackerIce, defender, move);
      assert.strictEqual(dmgSebo.dmg, Math.floor(dmgNoSebo.dmg * 0.5));
    });
  });

  describe('Ability: Aclimatación (Cloud Nine)', () => {
    it('should negate Fire move damage reduction to 0 under Heavy Rain if attacker or defender has Aclimatación', () => {
      const attacker: PurePokemon = { level: 100, spa: 200, type: 'fire', ability: 'Aclimatación' };
      const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
      const move: PureMove = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };

      const dmg = calculateDamagePure(attacker, defender, move, { weather: heavyRain });
      assert.ok(dmg.dmg > 0, 'Fire moves should deal damage under heavy rain when Aclimatacion is active');
    });

    it('should negate Water move damage reduction to 0 under Heatwave if defender has Aclimatación', () => {
      const attacker: PurePokemon = { level: 100, spa: 200, type: 'water' };
      const defender: PurePokemon = { level: 100, spd: 100, type: 'normal', ability: 'Aclimatación' };
      const move: PureMove = { name: 'Surf', type: 'water', power: 95, cat: 'special' };

      const dmg = calculateDamagePure(attacker, defender, move, { weather: heatwave });
      assert.ok(dmg.dmg > 0, 'Water moves should deal damage under heatwave when defender has Aclimatacion');
    });
  });

});
