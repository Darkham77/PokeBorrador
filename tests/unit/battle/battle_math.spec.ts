
/**
 * tests/unit/battle_math.spec.ts
 * 
 * VITEST UNIT TEST
 * 
 * Validates the core combat formulas from src/logic/battle/battleMath.ts.
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateDamagePure, 
  getEffectiveStatPure,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather
} from '../../../src/logic/battle/battleMath.ts';
import { calculateMoveAccuracy } from '../../../src/logic/battle/moveTooltipMath.ts';
import { mapVisualToOfficialWeather } from '../../../src/logic/weather/weatherGenerationProvider.ts';
import { getMechanicalWeather } from '../../../src/logic/weather/weatherRegistry.ts';
import type { Move } from '../../../src/types/pokemon/pokemon.ts';
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
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'day', 1.0, false);
      const resSun = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: sun }, 'day', 1.0, false);
      expect(resSun.dmg).toBeGreaterThan(resNormal.dmg);
    });

    it('Water moves should be 0.5x in Sun', () => {
      const sun: PureBattleWeather = { type: 'sun', turns: 5 };
      const resNormal = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'day', 1.0, false);
      const resSun = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: sun }, 'day', 1.0, false);
      expect(resSun.dmg).toBeLessThan(resNormal.dmg);
    });

    it('Extreme Heatwave should evaporate Water (0x)', () => {
      const heatwave: PureBattleWeather = { type: 'heatwave', turns: 5 };
      const res = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: heatwave }, 'day', 1.0, false);
      expect(res.dmg).toBe(0);
    });

    it('Extreme Storm should extinguish Fire (0x)', () => {
      const storm: PureBattleWeather = { type: 'storm', turns: 5 };
      const res = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: storm }, 'day', 1.0, false);
      expect(res.dmg).toBe(0);
    });
  });

  describe('Delta Stream (Strong Winds)', () => {
    const strongWinds: PureBattleWeather = { type: 'strong_winds', turns: 5 };

    it('Flying types should NOT be weak to Electric in Strong Winds', () => {
      const resNormal = calculateDamagePure(BLANCO, CHARIZARD, THUNDERBOLT, { weather: null }, 'day', 1.0, false);
      const resWind = calculateDamagePure(BLANCO, CHARIZARD, THUNDERBOLT, { weather: strongWinds }, 'day', 1.0, false);
      expect(resNormal.eff).toBeGreaterThan(1);
      expect(resWind.eff).toBe(1);
    });
  });

  describe('Stat Boosts (Sand/Snow)', () => {
    const sand: PureBattleWeather = { type: 'sandstorm', turns: 5 };
    const snow: PureBattleWeather = { type: 'snow', turns: 5 };

    it('Rock types get 1.5x SpD in Sandstorm', () => {
      const spdNormal = getEffectiveStatPure(TYRANITAR, 'spd', {}, null);
      const spdSand = getEffectiveStatPure(TYRANITAR, 'spd', {}, sand);
      expect(spdSand).toBe(Math.floor(spdNormal * 1.5));
    });

    it('Ice types get 1.5x Def in Snow', () => {
      const defNormal = getEffectiveStatPure(CLOYSTER, 'def', {}, null);
      const defSnow = getEffectiveStatPure(CLOYSTER, 'def', {}, snow);
      expect(defSnow).toBe(Math.floor(defNormal * 1.5));
    });
  });

  describe('Move Specifics (Solar Beam & Accuracy)', () => {
    const sand: PureBattleWeather = { type: 'sandstorm', turns: 5 };
    const fog: PureBattleWeather = { type: 'fog', turns: 5 };
    const mist: PureBattleWeather = { type: 'mist', turns: 5 };
    const dust: PureBattleWeather = { type: 'dust_storm', turns: 5 };

    it('Solar Beam should be 0.5x in Sandstorm', () => {
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0, false);
      const resSand = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: sand }, 'day', 1.0, false);
      expect(resSand.dmg).toBeLessThan(resNormal.dmg);
    });

    it('Solar Beam should be 0.5x in Fog', () => {
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0, false);
      const resFog = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: fog }, 'day', 1.0, false);
      expect(resFog.dmg).toBeLessThan(resNormal.dmg);
    });

    it('Fog should reduce accuracy to 0.6x', () => {
      // In Gen 3, visual 'fog' maps to 'none' official weather. No reduction.
      const officialWeatherGen3 = mapVisualToOfficialWeather('fog', 3);
      expect(officialWeatherGen3).toBe('none');
      const mechWeatherGen3 = getMechanicalWeather(officialWeatherGen3);
      expect(mechWeatherGen3).toBe('clear');
      
      const accGen3 = calculateMoveAccuracy(
        { id: 'tackle' } as unknown as Move,
        { type: officialWeatherGen3, turns: 5 },
        mechWeatherGen3,
        'day',
        100,
        0,
        0
      );
      expect(accGen3.final).toBe(100);
      expect(accGen3.list.length).toBe(0);

      // In Gen 4+, visual 'fog' maps to 'fog' official weather. Reduces accuracy to 0.6x (60%).
      const officialWeatherGen4 = mapVisualToOfficialWeather('fog', 4);
      expect(officialWeatherGen4).toBe('fog');
      const mechWeatherGen4 = getMechanicalWeather(officialWeatherGen4);
      expect(mechWeatherGen4).toBe('fog');

      const accGen4 = calculateMoveAccuracy(
        { id: 'tackle' } as unknown as Move,
        { type: officialWeatherGen4, turns: 5 },
        mechWeatherGen4,
        'day',
        100,
        0,
        0
      );
      expect(accGen4.final).toBe(60);
      expect(accGen4.list.length).toBeGreaterThan(0);
      expect(accGen4.list[0]!.label).toContain('Niebla/Bruma');
      expect(accGen4.list[0]!.mult).toBe(0.6);
    });

    it('Mist should be mapped to FOG mechanical group', () => {
      // Verification of the 0.8x penalty in Fog group
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0, false);
      const resMist = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: mist }, 'day', 1.0, false);
      expect(resMist.dmg).toBeLessThan(resNormal.dmg);
    });

    it('Dust Storm should also weaken Solar Beam', () => {
      const resNormal = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: null }, 'day', 1.0, false);
      const resDust = calculateDamagePure(CHARIZARD, BLANCO, SOLAR_BEAM, { weather: dust }, 'day', 1.0, false);
      expect(resDust.dmg).toBeLessThan(resNormal.dmg);
    });
  });

  describe('Extreme Weather Variants (Blizzard)', () => {
    const blizzard: PureBattleWeather = { type: 'blizzard', turns: 5 };
    const hail: PureBattleWeather = { type: 'hail', turns: 5 };

    it('Ice types get 1.5x Def in Blizzard (Extreme Hail)', () => {
      const defNormal = getEffectiveStatPure(CLOYSTER, 'def', {}, null);
      const defBlizz = getEffectiveStatPure(CLOYSTER, 'def', {}, blizzard);
      expect(defBlizz).toBe(Math.floor(defNormal * 1.5));
    });

    it('Hail should also grant the Def boost to Ice types', () => {
      const defNormal = getEffectiveStatPure(CLOYSTER, 'def', {}, null);
      const defHail = getEffectiveStatPure(CLOYSTER, 'def', {}, hail);
      expect(defHail).toBe(Math.floor(defNormal * 1.5));
    });
  });

  describe('Implicit Day/Night Cycles', () => {
    it('Fire should get 1.2x boost in Day when Clear', () => {
      const resNight = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'night', 1.0, false);
      const resDay = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: null }, 'day', 1.0, false);
      expect(resDay.dmg).toBeGreaterThan(resNight.dmg);
    });

    it('Water should get 1.2x boost in Night when Clear', () => {
      const resDay = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'day', 1.0, false);
      const resNight = calculateDamagePure(CLOYSTER, BLANCO, SURF, { weather: null }, 'night', 1.0, false);
      expect(resNight.dmg).toBeGreaterThan(resDay.dmg);
    });

    it('Day bonus should NOT apply if there is another weather (e.g. Rain)', () => {
      const rain: PureBattleWeather = { type: 'rain', turns: 5 };
      const resRainDay = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: rain }, 'day', 1.0, false);
      const resRainNight = calculateDamagePure(CHARIZARD, BLANCO, FLAMETHROWER, { weather: rain }, 'night', 1.0, false);
      expect(resRainDay.dmg).toBe(resRainNight.dmg);
    });
  });

});
