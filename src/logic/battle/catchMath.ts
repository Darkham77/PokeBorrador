import type {
  PurePokemon,
  PureCatchOptions,
  PureBattleWeather
} from './battleMathTypes.ts';
import { getEffectiveStat } from './damageMath.ts';

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;

const WEATHER_MAP: Record<string, string> = {
  sun: 'sun', heatwave: 'sun', intense_sun: 'sun',
  rain: 'rain', storm: 'rain', heavy_rain: 'rain',
  sandstorm: 'sandstorm', dust_storm: 'sandstorm',
  snow: 'snow', hail: 'hail', blizzard: 'hail',
  fog: 'fog', mist: 'fog',
  wind: 'wind', strong_winds: 'wind',
  clear: 'clear', thunderstorm: 'clear'
};

function getMechWeather(type: string | null | undefined): string {
  if (!type || type === 'clear' || type === 'null') return WEATHER_KEYS.CLEAR;
  return WEATHER_MAP[type.toLowerCase()] ?? 'unknown';
}

// ── Catch & Escape Logic ─────────────────────────────────────────────────────

export function calculateCatchRate(pokemon: PurePokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: PureCatchOptions = {}) {
  const ballName = String(rawBallType || '').toLowerCase();
  
  const BALL_BEHAVIORS: Record<string, { guaranteed?: boolean, mult?: number | ((p: PurePokemon, c: PureCatchOptions) => number) }> = {
    'master': { guaranteed: true },
    '100': { guaranteed: true },
    'ultra': { mult: 2.0 },
    'super': { mult: 1.5 },
    'súper': { mult: 1.5 },
    'net': { 
      mult: (p, c) => {
        const isWaterOrBug = (p.type === 'water' || p.type2 === 'water' || p.type === 'bug' || p.type2 === 'bug');
        const mech = getMechWeather(c.weather?.type);
        const isRain = mech === WEATHER_KEYS.RAIN;
        return (isWaterOrBug || isRain) ? 3.5 : 1.0;
      }
    },
    'dusk': { 
      mult: (_p, c) => {
        const cycle = c.cycle || 'day';
        const isNight = cycle === 'night' || cycle === 'dusk';
        const isCave = !!c.isCave;
        const mech = getMechWeather(c.weather?.type);
        const isFog = mech === WEATHER_KEYS.FOG;
        return (isNight || isCave || isFog) ? 3.0 : 1.0;
      }
    },
    'timer': { 
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
  };

  const behaviorEntry = Object.entries(BALL_BEHAVIORS).find(([key]) => ballName.includes(key));
  const behavior = behaviorEntry ? behaviorEntry[1] : { mult: 1.0 };

  if (behavior.guaranteed) return { caught: true, shakes: 3 };

  let ballMult = 1.0;
  if (typeof behavior.mult === 'function') ballMult = behavior.mult(pokemon, ctx);
  else if (behavior.mult) ballMult = behavior.mult;

  const curHp = pokemon.hp ?? 10;
  const maxHp = pokemon.maxHp ?? 10;
  const hpFactor = (3 * maxHp - 2 * curHp) / (3 * maxHp);
  let catchRate = pokemon.catchRate ?? 45;

  // Modificadores de Clase
  if (ctx.playerClass === 'cazabichos' && ctx.activeTeam) {
    const { calculateBugSymmetryBonus } = require('../player/classMath'); // Dynamic import for compatibility
    const bugBonus = calculateBugSymmetryBonus(ctx.activeTeam);
    catchRate = Math.floor(catchRate * bugBonus);
  } else if (ctx.playerClass === 'entrenador' && ctx.ivTotal !== undefined) {
    const { calculateTrainerCatchRateModifier } = require('../player/classMath');
    catchRate = calculateTrainerCatchRateModifier(catchRate, ctx.ivTotal);
  }

  const statusMult = (pokemon.status === 'sleep' || pokemon.status === 'freeze') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0);

  const eventBonus = eventCatchMult - 1;
  const totalMult = Math.max(0.1, ballMult + eventBonus);

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)));
  const b = Math.floor(65535 * Math.pow(finalRate / 255, 0.25));
  
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65535 < b) shakes++;
    else break;
  }

  return { caught: shakes === 4, shakes: Math.min(3, shakes) };
}

export function calculateEscapeChance(playerPoke: PurePokemon, wildPoke: PurePokemon, attempts: number, weather: PureBattleWeather | null) {
  const pSpe = getEffectiveStat(playerPoke, 'spe', {}, weather);
  const eSpe = getEffectiveStat(wildPoke, 'spe', {}, weather);
  const safeESpe = Math.max(1, eSpe);
  // Modern (Gen 4+)
  const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts;
  return Math.floor(Math.random() * 256) < f;
}
