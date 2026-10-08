import type { DayPhase } from '@/logic/utils/timeUtils';
import type { PokemonMoveId } from '@/data/battle/moves';
import type { PurePokemon, PureMove, PureBattleWeather } from './battleMathTypes.ts';
import { calculateDeltaStreamTypeEff } from './battleTypeEffectiveness.ts';

const WEATHER_BOOST_MULTIPLIER = 1.5 as const;
const WEATHER_REDUCTION_MULTIPLIER = 0.5 as const;
const DAY_CYCLE_BOOST_MULTIPLIER = 1.2 as const;
const TERRAIN_REDUCTION_MULTIPLIER = 0.5 as const;

const WEATHER_KEYS = {
  SUN: 'sun',
  RAIN: 'rain',
  SANDSTORM: 'sandstorm',
  SNOW: 'snow',
  HAIL: 'hail',
  FOG: 'fog',
  WIND: 'wind',
  CLEAR: 'clear'
} as const;

function calculateSunWeatherBonus(weatherType: string, moveType: string): number {
  if (moveType === 'fire') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'water') {
    return (weatherType === 'intense_sun' || weatherType === 'heatwave') ? 0 : WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateRainWeatherBonus(weatherType: string, moveType: string): number {
  if (moveType === 'water') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'fire') {
    return (weatherType === 'heavy_rain' || weatherType === 'storm') ? 0 : WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateThunderstormBonus(moveType: string): number {
  if (moveType === 'electric' || moveType === 'dragon') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'fire') return WEATHER_REDUCTION_MULTIPLIER;
  return 1;
}

function calculateActiveWeatherBonus(weather: PureBattleWeather, mechWeather: string, moveType: string): number {
  if (mechWeather === WEATHER_KEYS.SUN) {
    return calculateSunWeatherBonus(weather.type, moveType);
  }
  if (mechWeather === WEATHER_KEYS.RAIN) {
    return calculateRainWeatherBonus(weather.type, moveType);
  }
  if (weather.type === 'thunderstorm') {
    return calculateThunderstormBonus(moveType);
  }
  return 1;
}

function calculateDayCycleBonus(dayCycle: DayPhase | undefined, moveType: string): number {
  if ((dayCycle === 'day' || dayCycle === 'morning') && moveType === 'fire') return DAY_CYCLE_BOOST_MULTIPLIER;
  if ((dayCycle === 'night' || dayCycle === 'dusk') && moveType === 'water') return DAY_CYCLE_BOOST_MULTIPLIER;
  return 1;
}

function calculateSolarMovePenalty(
  isSolarMove: boolean,
  weather: PureBattleWeather | null | undefined,
  mechWeather: string,
  isGym: boolean,
  isMoveWeather: boolean
): number {
  if (!isSolarMove) return 1;
  if (!weather || weather.turns === 0) return 1;
  const isSun = mechWeather === WEATHER_KEYS.SUN;
  const isClear = (mechWeather === WEATHER_KEYS.CLEAR || weather.type === 'clear' || weather.type === 'none') && weather.type !== 'thunderstorm';
  if ((!isGym || isMoveWeather) && !isSun && !isClear) {
    return WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateWeatherDamageMultiplier(
  weather: PureBattleWeather | null | undefined,
  mechWeather: string,
  moveType: string,
  isGym: boolean,
  isMoveWeather: boolean,
  isSolarMove = false,
  dayCycle?: DayPhase
): number {
  let weatherMult = 1;
  if ((!isGym || isMoveWeather) && weather && weather.turns !== 0) {
    weatherMult = calculateActiveWeatherBonus(weather, mechWeather, moveType);
  } else if (!isGym && (!weather || weather.type === 'clear' || weather.type === 'none')) {
    weatherMult = calculateDayCycleBonus(dayCycle, moveType);
  }

  const solarPenalty = calculateSolarMovePenalty(isSolarMove, weather, mechWeather, isGym, isMoveWeather);
  return weatherMult * solarPenalty;
}

function resolveTerrainMultiplier(terrain: string | null | undefined, moveType: string, cleanMoveId: PokemonMoveId): number {
  if (terrain === 'grassyterrain' && moveType === 'ground' && (cleanMoveId === 'earthquake' || cleanMoveId === 'bulldoze' || cleanMoveId === 'magnitude')) {
    return TERRAIN_REDUCTION_MULTIPLIER;
  }
  return 1;
}

export function resolveEnvironmentModifiers(
  weather: PureBattleWeather | null,
  mechWeather: string | undefined,
  moveType: string,
  move: PureMove,
  isGym: boolean,
  dayCycle: DayPhase,
  terrain: string | null | undefined,
  eff: number,
  defender: PurePokemon,
): { weatherMult: number; finalEff: number; terrainMult: number } {
  const isMoveWeather = Boolean(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
  const isSolarMove = move.id === 'solarbeam' || move.id === 'solarblade';
  const weatherMult = calculateWeatherDamageMultiplier(weather, mechWeather || '', moveType, isGym, isMoveWeather, isSolarMove, dayCycle);

  const isStrongWinds = Boolean((!isGym || isMoveWeather) && weather && weather.turns !== 0 && weather.type === 'strong_winds');
  const finalEff = calculateDeltaStreamTypeEff(eff, defender, moveType, isStrongWinds);
  const terrainMult = move.id ? resolveTerrainMultiplier(terrain, moveType, move.id) : 1;

  return { weatherMult, finalEff, terrainMult };
}
