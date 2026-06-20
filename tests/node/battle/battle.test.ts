/**
 * tests/node/battle.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Migrated from tests/unit/battle.spec.ts
 *
 * Uses battleMath.ts — a pure math module with zero browser/Vue dependencies.
 * This avoids the transitive Vue chain: battleFormulas → pokemonDataProvider → vue.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDamagePure,
  getEffectiveStat,
  getAbilityMultiplier,
  getMoveCategory,
  STAGE_MULTIPLIERS_STAT,
  ACTIVE_RULE_SET,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather,
} from '../../../src/logic/battle/battleMath.ts';

describe('Battle Engine – Pure Math (Native Node.js 26+)', () => {

  // Fix Math.random for deterministic results (max damage roll)
  mock.method(Math, 'random', () => 1.0);

  // ── getMoveCategory ──────────────────────────────────────────────────────────

  describe('getMoveCategory (Gen 2 ruleset)', () => {
    it('should return physical for Normal type', () => {
      assert.strictEqual(getMoveCategory({ type: 'normal', cat: 'physical' }), 'physical');
    });

    it('should return special for Electric type', () => {
      assert.strictEqual(getMoveCategory({ type: 'electric', cat: 'physical' }), 'special');
    });

    it('should return special for Fire type', () => {
      assert.strictEqual(getMoveCategory({ type: 'fire', cat: 'physical' }), 'special');
    });

    it('should always return status for status moves regardless of type', () => {
      assert.strictEqual(getMoveCategory({ type: 'fire', cat: 'status' }), 'status');
    });
  });

  // ── STAGE_MULTIPLIERS_STAT ───────────────────────────────────────────────────

  describe('STAGE_MULTIPLIERS_STAT', () => {
    it('should have 1.0 at stage 0', () => {
      assert.strictEqual(STAGE_MULTIPLIERS_STAT['0'], 1.0);
    });
    it('should have 2.0 at stage +2', () => {
      assert.strictEqual(STAGE_MULTIPLIERS_STAT['2'], 2.0);
    });
    it('should have 0.5 at stage -2', () => {
      assert.strictEqual(STAGE_MULTIPLIERS_STAT['-2'], 0.50);
    });
  });

  // ── getAbilityMultiplier ─────────────────────────────────────────────────────

  describe('getAbilityMultiplier', () => {
    it('Torrente should boost Water at low HP', () => {
      const attacker: PurePokemon = { level: 50, hp: 10, maxHp: 90, spa: 100, type: 'water', ability: 'torrent' };
      const move: PureMove = { type: 'water', power: 90, cat: 'special' };
      const { mult } = getAbilityMultiplier(attacker, move);
      assert.strictEqual(mult, 1.5);
    });

    it('Experto should boost moves with power ≤ 60', () => {
      const attacker: PurePokemon = { level: 50, hp: 50, maxHp: 100, atk: 100, type: 'normal', ability: 'technician' };
      const { mult } = getAbilityMultiplier(attacker, { type: 'normal', power: 40, cat: 'physical' });
      assert.strictEqual(mult, 1.5);
    });

    it('Experto should NOT boost moves with power > 60', () => {
      const attacker: PurePokemon = { level: 50, hp: 50, maxHp: 100, atk: 100, type: 'normal', ability: 'technician' };
      const { mult } = getAbilityMultiplier(attacker, { type: 'normal', power: 90, cat: 'physical' });
      assert.strictEqual(mult, 1);
    });
  });

  // ── getEffectiveStat ─────────────────────────────────────────────────────────

  describe('getEffectiveStat', () => {
    it('should return base stat at stage 0', () => {
      const p: PurePokemon = { spe: 100, type: 'normal', level: 50 };
      assert.strictEqual(getEffectiveStat(p, 'spe', {}, null), 100);
    });

    it('should double speed at stage +2', () => {
      const p: PurePokemon = { spe: 100, type: 'normal', level: 50 };
      assert.strictEqual(getEffectiveStat(p, 'spe', { spe: 2 }, null), 200);
    });

    it('Paralysis should reduce speed by 50%', () => {
      const p: PurePokemon = { spe: 100, type: 'normal', level: 50, status: 'paralysis' };
      assert.strictEqual(getEffectiveStat(p, 'spe', {}, null), 50);
    });

    it('Burn should halve attack', () => {
      const p: PurePokemon = { atk: 100, type: 'normal', level: 50, status: 'burn' };
      assert.strictEqual(getEffectiveStat(p, 'atk', {}, null), 50);
    });

    it('Clorofila should double speed in Sun (day cycle)', () => {
      const p: PurePokemon = { spe: 50, type: 'grass', level: 50, ability: 'chlorophyll' };
      // Pass weather=null and explicitly set dayCycle='day' to simulate sun-equivalent bonus
      const noAbility = getEffectiveStat({ ...p, ability: null }, 'spe', {}, null, 'day');
      const withAbility = getEffectiveStat(p, 'spe', {}, null, 'day');
      assert.strictEqual(withAbility, noAbility * 2);
    });
  });

  // ── calculateDamagePure – Damage Formula ────────────────────────────────────

  describe('calculateDamagePure – Damage Formula', () => {
    const attacker: PurePokemon = { level: 100, atk: 200, spa: 200, type: 'electric' };
    const defender: PurePokemon = { level: 100, def: 100, spd: 100, type: 'normal' };
    const move: PureMove        = { name: 'Rayo', type: 'electric', power: 90, cat: 'special' };

    it('should calculate base special damage correctly', () => {
      const result = calculateDamagePure(attacker, defender, move, { atkStages: 0, defStages: 0 });
      assert.strictEqual(result.dmg, 229);
    });

    it('should scale damage with +2 attack stages (2x multiplier)', () => {
      const result = calculateDamagePure(attacker, defender, move, { atkStages: 2, defStages: 0 });
      assert.strictEqual(result.dmg, 456);
    });

    it('should scale damage with +2 defense stages (0.5x multiplier)', () => {
      const result = calculateDamagePure(attacker, defender, move, { atkStages: 0, defStages: 2 });
      assert.strictEqual(result.dmg, 115);
    });
  });

  // ── calculateDamagePure – Abilities ─────────────────────────────────────────

  describe('calculateDamagePure – Abilities', () => {
    it('Intrépido should allow Normal to hit Ghost (eff = 1)', () => {
      const attacker: PurePokemon = { level: 50, atk: 100, type: 'normal', ability: 'scrappy' };
      const defender: PurePokemon = { level: 50, def: 50,  type: 'ghost' };
      const move: PureMove        = { name: 'Pisotón', type: 'normal', power: 65, cat: 'physical' };

      const result = calculateDamagePure(attacker, defender, move);
      assert.ok(result.dmg > 0, 'Damage should be > 0');
      assert.strictEqual(result.eff, 1);
    });

    it('Sebo should reduce Fire damage by 50%', () => {
      const attacker: PurePokemon = { level: 50, spa: 100, type: 'fire' };
      const defender: PurePokemon = { level: 50, spd: 100, type: 'normal', ability: 'thickfat' };
      const move: PureMove        = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };

      const noSebo = calculateDamagePure(attacker, { ...defender, ability: null }, move);
      const sebo   = calculateDamagePure(attacker, defender, move);

      assert.strictEqual(sebo.dmg, Math.floor(noSebo.dmg * 0.5));
    });
  });

  // ── calculateDamagePure – Weather ───────────────────────────────────────────

  describe('calculateDamagePure – Weather', () => {
    const attacker: PurePokemon = { level: 50, spa: 100, type: 'fire' };
    const defender: PurePokemon = { level: 50, spd: 100, type: 'normal' };
    const move: PureMove        = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' };
    const sun:  PureBattleWeather = { type: 'sun',  turns: 5 };
    const rain: PureBattleWeather = { type: 'rain', turns: 5 };

    it('should boost Fire damage in Sun (1.5x)', () => {
      const result = calculateDamagePure(attacker, defender, move, { weather: sun });
      assert.strictEqual(result.dmg, 92);
    });

    it('should reduce Fire damage in Rain (0.5x)', () => {
      const result = calculateDamagePure(attacker, defender, move, { weather: rain });
      assert.strictEqual(result.dmg, 30);
    });
  });

  // ── Constants ────────────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('ACTIVE_RULE_SET should be Gen 2 (value 2)', () => {
      assert.strictEqual(ACTIVE_RULE_SET, 2);
    });
  });
});
