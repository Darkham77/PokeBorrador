/**
 * tests/node/battle_math.test.ts
 * 
 * NATIVE NODE.JS TEST (Node.js 26+)
 * 
 * Validates the core combat formulas from src/logic/battle/battleMath.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  calculateDamagePure, 
  getEffectiveStat,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather
} from '../../src/logic/battle/battleMath.ts';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const CHARIZARD: PurePokemon = {
  name: 'Charizard',
  level: 50,
  atk: 100,
  def: 100,
  spa: 100,
  spd: 100,
  spe: 100,
  type: 'fire',
  type2: 'flying',
  hp: 150,
  maxHp: 150
};

const BLANCO: PurePokemon = {
  name: 'Neutral',
  level: 50,
  atk: 100,
  def: 100,
  spa: 100,
  spd: 100,
  spe: 100,
  type: 'normal',
  hp: 150,
  maxHp: 150
};

const TYRANITAR: PurePokemon = {
  name: 'Tyranitar',
  level: 50,
  atk: 100,
  def: 100,
  spa: 100,
  spd: 100,
  spe: 100,
  type: 'rock',
  type2: 'dark',
  hp: 150,
  maxHp: 150
};

const CLOYSTER: PurePokemon = {
  name: 'Cloyster',
  level: 50,
  atk: 100,
  def: 100,
  spa: 100,
  spd: 100,
  spe: 100,
  type: 'water',
  type2: 'ice',
  hp: 150,
  maxHp: 150
};

const FLAMETHROWER: PureMove = { id: 'flamethrower', type: 'fire', power: 90, cat: 'special' };
const SURF: PureMove = { id: 'surf', type: 'water', power: 90, cat: 'special' };
const SOLAR_BEAM: PureMove = { id: 'solar_beam', type: 'grass', power: 120, cat: 'special' };
const THUNDERBOLT: PureMove = { id: 'thunderbolt', type: 'electric', power: 90, cat: 'special' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Battle Math Core (Weather & Cycles)', () => {

  describe('Damage Multipliers (Sun/Rain)', () => {
    it('Fire moves should be 1.5x in Sun', () => {
      const sun: PureBattleWeather = { type: 'sun', turns: 5 };
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'day', 1.0);
      const resSun = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: sun }, 'day', 1.0);
      assert.ok(resSun.dmg > resNormal.dmg, `Sun damage (${resSun.dmg}) should be > Normal (${resNormal.dmg})`);
    });

    it('Water moves should be 0.5x in Sun', () => {
      const sun: PureBattleWeather = { type: 'sun', turns: 5 };
      const resNormal = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'day', 1.0);
      const resSun = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: sun }, 'day', 1.0);
      assert.ok(resSun.dmg < resNormal.dmg, `Sun damage (${resSun.dmg}) should be < Normal (${resNormal.dmg})`);
    });

    it('Extreme Heatwave should evaporate Water (0x)', () => {
      const heatwave: PureBattleWeather = { type: 'heatwave', turns: 5 };
      const res = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: heatwave }, 'day', 1.0);
      assert.strictEqual(res.dmg, 0, 'Heatwave should result in 0 damage for Water moves');
    });

    it('Extreme Storm should extinguish Fire (0x)', () => {
      const storm: PureBattleWeather = { type: 'storm', turns: 5 };
      const res = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: storm }, 'day', 1.0);
      assert.strictEqual(res.dmg, 0, 'Storm should result in 0 damage for Fire moves');
    });
  });

  describe('Delta Stream (Strong Winds)', () => {
    const strongWinds: PureBattleWeather = { type: 'strong_winds', turns: 5 };

    it('Flying types should NOT be weak to Electric in Strong Winds', () => {
      const resNormal = calculateDamagePure(BLANCO, CHARIZARD, THUNDERBOLT, { weather: null }, 'day', 1.0);
      const resWind = calculateDamagePure(BLANCO, CHARIZARD, THUNDERBOLT, { weather: strongWinds }, 'day', 1.0);
      assert.ok(resNormal.eff > 1, 'Thunderbolt should be Super Effective normally');
      assert.strictEqual(resWind.eff, 1, 'Thunderbolt should be Neutral in Strong Winds');
    });
  });

  describe('Stat Boosts (Sand/Snow)', () => {
    const sand: PureBattleWeather = { type: 'sandstorm', turns: 5 };
    const snow: PureBattleWeather = { type: 'snow', turns: 5 };

    it('Rock types get 1.5x SpD in Sandstorm', () => {
      const spdNormal = getEffectiveStat(TYRANITAR, 'spd', {}, null);
      const spdSand = getEffectiveStat(TYRANITAR, 'spd', {}, sand);
      assert.strictEqual(spdSand, Math.floor(spdNormal * 1.5));
    });

    it('Ice types get 1.5x Def in Snow', () => {
      const defNormal = getEffectiveStat(CLOYSTER, 'def', {}, null);
      const defSnow = getEffectiveStat(CLOYSTER, 'def', {}, snow);
      assert.strictEqual(defSnow, Math.floor(defNormal * 1.5));
    });
  });

  describe('Move Specifics (Solar Beam)', () => {
    const sand: PureBattleWeather = { type: 'sandstorm', turns: 5 };
    const fog: PureBattleWeather = { type: 'fog', turns: 5 };

    it('Solar Beam should be 0.5x in Sandstorm', () => {
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0);
      const resSand = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: sand }, 'day', 1.0);
      assert.ok(resSand.dmg < resNormal.dmg, 'Solar Beam should be weakened in Sandstorm');
    });

    it('Solar Beam should be 0.5x in Fog', () => {
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0);
      const resFog = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: fog }, 'day', 1.0);
      assert.ok(resFog.dmg < resNormal.dmg, 'Solar Beam should be weakened in Fog');
    });
  });

  describe('Implicit Day/Night Cycles', () => {
    it('Fire should get 1.2x boost in Day when Clear', () => {
      const resNight = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'night', 1.0);
      const resDay = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'day', 1.0);
      assert.ok(resDay.dmg > resNight.dmg, 'Day damage should be > Night damage for Fire');
    });

    it('Water should get 1.2x boost in Night when Clear', () => {
      const resDay = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'day', 1.0);
      const resNight = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'night', 1.0);
      assert.ok(resNight.dmg > resDay.dmg, 'Night damage should be > Day damage for Water');
    });

    it('Day bonus should NOT apply if there is another weather (e.g. Rain)', () => {
      const rain: PureBattleWeather = { type: 'rain', turns: 5 };
      const resRainDay = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: rain }, 'day', 1.0);
      const resRainNight = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: rain }, 'night', 1.0);
      assert.strictEqual(resRainDay.dmg, resRainNight.dmg, 'Day/Night should not matter during Rain');
    });
  });

});
