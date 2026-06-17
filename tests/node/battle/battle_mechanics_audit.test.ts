/**
 * tests/node/battle_mechanics_audit.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Comprehensive audit of new battle mechanics:
 * - Thunderstorm offensive boosts (Electric/Dragon).
 * - Solar Beam reduction in non-sunny weather.
 * - Sand Force ability (Rock/Ground/Steel in Sandstorm).
 * - Solar Power ability (SpA boost in Sun).
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

describe('Battle Mechanics Audit – New Weather & Abilities', () => {

  // Fix Math.random for deterministic results (max damage roll)
  mock.method(Math, 'random', () => 1.0);

  // ── Thunderstorm Mechanics ──────────────────────────────────────────────────

  describe('Thunderstorm (Dry Storm)', () => {
    const attacker: PurePokemon = { level: 100, spa: 200, type: 'electric' };
    const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
    const thunderstorm: PureBattleWeather = { type: 'thunderstorm', turns: 5 };

    it('should boost Electric moves by 1.5x', () => {
      const move: PureMove = { name: 'Rayo', type: 'electric', power: 90, cat: 'special' };
      const withWeather = calculateDamagePure(attacker, defender, move, { weather: thunderstorm });
      
      // Damage Calculation: 
      // Base: Math.floor((42 * 90 * 2) / 50) + 2 = 153
      // STAB: 1.5x -> 229.5
      // Weather: 1.5x -> 153 * 1.5 * 1.5 = 344.25 -> 344
      assert.strictEqual(withWeather.dmg, 344);
    });

    it('should boost Dragon moves by 1.5x', () => {
      const attackerDragon: PurePokemon = { ...attacker, type: 'dragon' };
      const move: PureMove = { name: 'Dragoaliento', type: 'dragon', power: 60, cat: 'special' };
      const withWeather = calculateDamagePure(attackerDragon, defender, move, { weather: thunderstorm });
      
      // Base: Math.floor((42 * 60 * 2) / 50) + 2 = 102
      // STAB: 1.5x -> 153
      // Weather: 1.5x -> 102 * 1.5 * 1.5 = 229.5 -> 229
      assert.strictEqual(withWeather.dmg, 229);
    });

    it('should NOT penalize Fire moves (Dry Storm parity)', () => {
      const attackerFire: PurePokemon = { ...attacker, type: 'fire' };
      const move: PureMove = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };
      const noWeather = calculateDamagePure(attackerFire, defender, move, { weather: null });
      const withWeather = calculateDamagePure(attackerFire, defender, move, { weather: thunderstorm });
      
      assert.strictEqual(withWeather.dmg, noWeather.dmg);
    });
  });

  // ── Solar Beam Logic ────────────────────────────────────────────────────────

  describe('Solar Beam Weather Penalties', () => {
    const attacker: PurePokemon = { level: 100, spa: 200, type: 'grass' };
    const defender: PurePokemon = { level: 100, spd: 100, type: 'normal' };
    const move: PureMove = { id: 'solar_beam', type: 'grass', power: 120, cat: 'special' };

    const clear:        PureBattleWeather = { type: 'clear', turns: -1 };
    const sun:          PureBattleWeather = { type: 'sun', turns: 5 };
    const rain:         PureBattleWeather = { type: 'rain', turns: 5 };
    const sandstorm:    PureBattleWeather = { type: 'sandstorm', turns: 5 };
    const thunderstorm: PureBattleWeather = { type: 'thunderstorm', turns: 5 };

    it('should have 100% power in Sun', () => {
      const res = calculateDamagePure(attacker, defender, move, { weather: sun });
      // Base: Math.floor((42 * 120 * 2) / 50) + 2 = 203
      // STAB: 1.5x -> 304.5 -> 304
      assert.strictEqual(res.dmg, 304);
    });

    it('should have 100% power in Clear weather', () => {
      const res = calculateDamagePure(attacker, defender, move, { weather: clear });
      assert.strictEqual(res.dmg, 304);
    });

    it('should have 50% power in Rain', () => {
      const res = calculateDamagePure(attacker, defender, move, { weather: rain });
      assert.strictEqual(res.dmg, Math.floor(304 * 0.5));
    });

    it('should have 50% power in Sandstorm', () => {
      const res = calculateDamagePure(attacker, defender, move, { weather: sandstorm });
      assert.strictEqual(res.dmg, Math.floor(304 * 0.5));
    });

    it('should have 50% power in Thunderstorm', () => {
      const res = calculateDamagePure(attacker, defender, move, { weather: thunderstorm });
      assert.strictEqual(res.dmg, Math.floor(304 * 0.5));
    });
  });

  // ── Sand Force Ability ──────────────────────────────────────────────────────

  describe('Ability: Fuerza Arena (Sand Force)', () => {
    const attacker: PurePokemon = { level: 100, atk: 200, type: 'ground', ability: 'Fuerza arena' };
    const sandstorm: PureBattleWeather = { type: 'sandstorm', turns: 5 };

    it('should boost Ground moves by 1.3x in Sandstorm', () => {
      const move: PureMove = { type: 'ground', power: 100, cat: 'physical' };
      const { mult } = getAbilityMultiplier(attacker, move, sandstorm);
      assert.strictEqual(mult, 1.3);
    });

    it('should boost Rock moves by 1.3x in Sandstorm', () => {
      const move: PureMove = { type: 'rock', power: 100, cat: 'physical' };
      const { mult } = getAbilityMultiplier(attacker, move, sandstorm);
      assert.strictEqual(mult, 1.3);
    });

    it('should boost Steel moves by 1.3x in Sandstorm', () => {
      const move: PureMove = { type: 'steel', power: 100, cat: 'physical' };
      const { mult } = getAbilityMultiplier(attacker, move, sandstorm);
      assert.strictEqual(mult, 1.3);
    });

    it('should NOT boost Normal moves in Sandstorm', () => {
      const move: PureMove = { type: 'normal', power: 100, cat: 'physical' };
      const { mult } = getAbilityMultiplier(attacker, move, sandstorm);
      assert.strictEqual(mult, 1);
    });

    it('should NOT boost Ground moves if NO Sandstorm', () => {
      const move: PureMove = { type: 'ground', power: 100, cat: 'physical' };
      const { mult } = getAbilityMultiplier(attacker, move, null);
      assert.strictEqual(mult, 1);
    });
  });

  // ── Solar Power Ability ─────────────────────────────────────────────────────

  describe('Ability: Poder solar (Solar Power)', () => {
    const attacker: PurePokemon = { level: 100, spa: 100, type: 'fire', ability: 'Poder solar' };
    const sun: PureBattleWeather = { type: 'sun', turns: 5 };

    it('should boost SpA by 1.5x in Sun', () => {
      const stat = getEffectiveStat(attacker, 'spa', {}, sun);
      assert.strictEqual(stat, 150);
    });

    it('should NOT boost SpA if NO Sun (Night)', () => {
      const stat = getEffectiveStat(attacker, 'spa', {}, null, 'night');
      assert.strictEqual(stat, 100);
    });
  });

});
