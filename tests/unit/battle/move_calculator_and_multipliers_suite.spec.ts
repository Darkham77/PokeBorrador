import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { getCombatEnvState } from '@/logic/battle/moveCalculator';
import {
  calculateStabMultiplier,
  calculateWeatherAndCyclePowerMultiplier,
  calculateAbilityPowerMultiplier,
  calculateItemPowerMultiplier,
} from '@/logic/battle/movePowerMultipliers';
import { WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PureBattleWeather } from '@/logic/battle/battleMathTypes';
import * as timeUtils from '@/logic/utils/timeUtils';
import { prepareSeatPayload } from '@/logic/battle/orchestratorPayloadHelper.ts';
import { syncActiveMovesFromRequest } from '@/stores/battle/battleMoveSync.ts';
import { makePokemon } from '@/logic/pokemon/pokemonFactory.ts';
import type { BattleState, ShowdownPlayerRequest } from '@/types/battle/battle.ts';
import { useGameStore } from '@/stores/game.ts';

describe('Move Calculator, Multipliers & PP Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('moveCalculator - getCombatEnvState', () => {
    it('suppresses weather when isGym is true', () => {
      const weather: PureBattleWeather = { type: 'rain', turns: 5 };
      const state = getCombatEnvState(null, null, weather, true);

      expect(state.isSunActive).toBe(false);
      expect(state.isRainActive).toBe(false);
      expect(state.isRaining).toBe(false);
      expect(state.isSunny).toBe(false);
      expect(state.isSnowing).toBe(false);
      expect(state.mechWeather).toBe(WEATHER_MECHANICAL.CLEAR);
      expect(state.weatherType).toBeUndefined();
      expect(state.isThunderstorm).toBe(false);
    });

    it('suppresses weather when attacker has cloudnine', () => {
      const attacker = { ability: 'cloudnine' } as unknown as Pokemon;
      const weather: PureBattleWeather = { type: 'sun', turns: 5 };
      const state = getCombatEnvState(attacker, null, weather, false);

      expect(state.isSunActive).toBe(false);
      expect(state.isSunny).toBe(false);
      expect(state.mechWeather).toBe(WEATHER_MECHANICAL.CLEAR);
    });

    it('suppresses weather when defender has cloudnine', () => {
      const defender = { ability: 'cloudnine' } as unknown as Pokemon;
      const weather: PureBattleWeather = { type: 'rain', turns: 5 };
      const state = getCombatEnvState(null, defender, weather, false);

      expect(state.isRainActive).toBe(false);
      expect(state.isRaining).toBe(false);
      expect(state.mechWeather).toBe(WEATHER_MECHANICAL.CLEAR);
    });

    it('calculates active rain and thunderstorm flags correctly', () => {
      vi.spyOn(timeUtils, 'getDayCycle').mockReturnValue('day');
      const weather: PureBattleWeather = { type: 'rain', turns: 5 };
      const state = getCombatEnvState(null, null, weather, false);

      expect(state.isRaining).toBe(true);
      expect(state.isRainActive).toBe(true);
      expect(state.mechWeather).toBe(WEATHER_MECHANICAL.RAIN);

      const thunderstorm: PureBattleWeather = { type: 'thunderstorm', turns: 5 };
      const stateThunder = getCombatEnvState(null, null, thunderstorm, false);
      expect(stateThunder.isThunderstorm).toBe(true);
    });

    it('calculates active sun flags correctly', () => {
      vi.spyOn(timeUtils, 'getDayCycle').mockReturnValue('night');
      const weather: PureBattleWeather = { type: 'sun', turns: 5 };
      const state = getCombatEnvState(null, null, weather, false);

      expect(state.isSunny).toBe(true);
      expect(state.isSunActive).toBe(true);
      expect(state.mechWeather).toBe(WEATHER_MECHANICAL.SUN);
    });

    it('activates day/night ambient flags when mechanical weather is clear', () => {
      vi.spyOn(timeUtils, 'getDayCycle').mockReturnValue('morning');
      const stateDay = getCombatEnvState(null, null, null, false);
      expect(stateDay.isSunActive).toBe(true);
      expect(stateDay.isRainActive).toBe(false);

      vi.spyOn(timeUtils, 'getDayCycle').mockReturnValue('night');
      const stateNight = getCombatEnvState(null, null, null, false);
      expect(stateNight.isSunActive).toBe(false);
      expect(stateNight.isRainActive).toBe(true);
    });

    it('sets isSnowing flag when mechanical weather is snow or hail', () => {
      const weatherSnow: PureBattleWeather = { type: 'snow', turns: 5 };
      const stateSnow = getCombatEnvState(null, null, weatherSnow, false);
      expect(stateSnow.isSnowing).toBe(true);

      const weatherHail: PureBattleWeather = { type: 'hail', turns: 5 };
      const stateHail = getCombatEnvState(null, null, weatherHail, false);
      expect(stateHail.isSnowing).toBe(true);
    });
  });

  describe('movePowerMultipliers', () => {
    it('calculates STAB multiplier correctly', () => {
      const fireAttacker = { type: 'fire', type2: 'flying', ability: 'blaze' } as unknown as Pokemon;
      expect(calculateStabMultiplier('fire', fireAttacker)).toBe(1.5);
      expect(calculateStabMultiplier('water', fireAttacker)).toBe(1);

      const adaptabilityAttacker = { type: 'normal', type2: null, ability: 'adaptability' } as unknown as Pokemon;
      expect(calculateStabMultiplier('normal', adaptabilityAttacker)).toBe(2);
    });

    it('calculates weather power boost for sun and rain', () => {
      const sunMult = calculateWeatherAndCyclePowerMultiplier(
        'fire',
        'flamethrower',
        { type: 'sun', turns: 5 },
        WEATHER_MECHANICAL.SUN,
        'day'
      );
      expect(sunMult).toBe(1.5);

      const rainWaterMult = calculateWeatherAndCyclePowerMultiplier(
        'water',
        'surf',
        { type: 'rain', turns: 5 },
        WEATHER_MECHANICAL.RAIN,
        'day'
      );
      expect(rainWaterMult).toBe(1.5);

      const heatwaveWaterMult = calculateWeatherAndCyclePowerMultiplier(
        'water',
        'surf',
        { type: 'heatwave', turns: 5 },
        WEATHER_MECHANICAL.SUN,
        'day'
      );
      expect(heatwaveWaterMult).toBe(0);

      const thunderMult = calculateWeatherAndCyclePowerMultiplier(
        'electric',
        'thunderbolt',
        { type: 'thunderstorm', turns: 5 },
        WEATHER_MECHANICAL.CLEAR,
        'day'
      );
      expect(thunderMult).toBe(1.5);

      const solarBeamRainMult = calculateWeatherAndCyclePowerMultiplier(
        'grass',
        'solarbeam',
        { type: 'rain', turns: 5 },
        WEATHER_MECHANICAL.RAIN,
        'day'
      );
      expect(solarBeamRainMult).toBe(0.5);

      const solarBeamSunMult = calculateWeatherAndCyclePowerMultiplier(
        'grass',
        'solarbeam',
        { type: 'sun', turns: 5 },
        WEATHER_MECHANICAL.SUN,
        'day'
      );
      expect(solarBeamSunMult).toBe(1);

      const dayCycleFireMult = calculateWeatherAndCyclePowerMultiplier(
        'fire',
        'flamethrower',
        null,
        WEATHER_MECHANICAL.CLEAR,
        'day'
      );
      expect(dayCycleFireMult).toBe(1.2);
    });

    it('calculates pinch ability multiplier at low HP', () => {
      const lowHpCharizard = {
        hp: 10,
        maxHp: 100,
        ability: 'blaze',
      } as unknown as Pokemon;

      expect(calculateAbilityPowerMultiplier('fire', 90, lowHpCharizard, null, null, WEATHER_MECHANICAL.CLEAR)).toBe(1.5);
      expect(calculateAbilityPowerMultiplier('water', 90, lowHpCharizard, null, null, WEATHER_MECHANICAL.CLEAR)).toBe(1);
    });

    it('calculates item power multiplier for held items', () => {
      expect(calculateItemPowerMultiplier('fire', 'special', 'charcoal')).toBe(1.2);
      expect(calculateItemPowerMultiplier('normal', 'physical', 'choiceband')).toBe(1.5);
      expect(calculateItemPowerMultiplier('normal', 'special', 'choiceband')).toBe(1);
    });
  });

  describe('PP Persistence Across Battles & Showdown Worker', () => {
    it('prepareSeatPayload accurately extracts movesPP map with current PP for each move', () => {
      const pidgeot = makePokemon('pidgeot', 31)!;
      pidgeot.uid = 'pidgeot-uid-123';
      pidgeot.moves = [
        { id: 'wingattack', name: 'Ataque Ala', type: 'flying', cat: 'physical', power: 60, acc: 100, pp: 20, maxPP: 56, priority: 0 },
        { id: 'whirlwind', name: 'Remolino', type: 'normal', cat: 'status', power: 0, acc: 100, pp: 23, maxPP: 32, priority: -6 }
      ];

      const payload = prepareSeatPayload([pidgeot], pidgeot, null, 'Player');

      expect(payload.movesPP).toBeDefined();
      expect(payload.movesPP['pidgeot-uid-123']).toEqual({
        wingattack: 20,
        whirlwind: 23
      });
    });

    it('syncActiveMovesFromRequest syncs reduced PP without resetting to maxPP', () => {
      const gs = useGameStore();
      const pidgeot = makePokemon('pidgeot', 31)!;
      pidgeot.uid = 'pidgeot-uid-123';
      pidgeot.moves = [
        { id: 'wingattack', name: 'Ataque Ala', type: 'flying', cat: 'physical', power: 60, acc: 100, pp: 35, maxPP: 56, priority: 0 },
        { id: 'whirlwind', name: 'Remolino', type: 'normal', cat: 'status', power: 0, acc: 100, pp: 23, maxPP: 32, priority: -6 }
      ];
      gs.state.team = [pidgeot];

      const mockActiveBattle: Partial<BattleState> = {
        player: pidgeot,
        playerRequest: {
          active: [{
            moves: [
              { move: 'Ataque Ala', id: 'wingattack', pp: 34, maxpp: 56, target: 'normal' },
              { move: 'Remolino', id: 'whirlwind', pp: 22, maxpp: 32, target: 'normal' }
            ]
          }],
          side: {
            pokemon: [{
              ident: 'p1: pidgeot-uid-123',
              uid: 'pidgeot-uid-123',
              active: true
            }]
          }
        } as unknown as ShowdownPlayerRequest
      };

      syncActiveMovesFromRequest(mockActiveBattle as BattleState, 'player');

      expect(pidgeot.moves[0]!.pp).toBe(34);
      expect(pidgeot.moves[1]!.pp).toBe(22);
      expect(gs.state.team[0]!.moves[0]!.pp).toBe(34);
      expect(gs.state.team[0]!.moves[1]!.pp).toBe(22);
    });
  });
});
