import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_REGISTRY } from '../weather/weatherRegistry.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleWeather, BattleSide } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';

import type { PokemonType } from '@/data/battle/types.ts';

const SAND_IMMUNE_TYPES = ['rock', 'ground', 'steel'] as const satisfies readonly PokemonType[];
const SAND_IMMUNE_TYPES_SET: ReadonlySet<PokemonType> = new Set<PokemonType>(SAND_IMMUNE_TYPES); // runtime-set: Fast O(1) membership lookup set
const WEATHER_CHIP_DAMAGE_DIVISOR = 16;
const SOLAR_POWER_DAMAGE_DIVISOR = 8;

function isSandImmune(poke: Pokemon): boolean {
  return SAND_IMMUNE_TYPES_SET.has(poke.type) || (poke.type2 ? SAND_IMMUNE_TYPES_SET.has(poke.type2) : false);
}

function isHailImmune(poke: Pokemon): boolean {
  return poke.type === 'ice' || poke.type2 === 'ice';
}

function applyWeatherDamage(
  poke: Pokemon,
  weatherLabel: string,
  side: BattleSide,
  ctx: BattleContext,
  promises: Promise<void>[]
): void {
  const dmg = Math.max(1, Math.floor(poke.maxHp / WEATHER_CHIP_DAMAGE_DIVISOR));
  poke.hp = Math.max(0, poke.hp - dmg);
  const logType = side === 'player' ? 'log-player' : 'log-enemy';
  ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${poke.name}! (-${dmg} HP)`, logType, poke);
  if (ctx.animations?.handleBlinkRequest) {
    promises.push(ctx.animations.handleBlinkRequest({ side }));
  }
}

function applySandstormWeather(p: Pokemon, e: Pokemon, weatherLabel: string, ctx: BattleContext, promises: Promise<void>[]): void {
  if (!isSandImmune(p)) applyWeatherDamage(p, weatherLabel, 'player', ctx, promises);
  if (!isSandImmune(e)) applyWeatherDamage(e, weatherLabel, 'enemy', ctx, promises);
}

function applyHailWeather(p: Pokemon, e: Pokemon, weatherLabel: string, ctx: BattleContext, promises: Promise<void>[]): void {
  if (!isHailImmune(p)) applyWeatherDamage(p, weatherLabel, 'player', ctx, promises);
  if (!isHailImmune(e)) applyWeatherDamage(e, weatherLabel, 'enemy', ctx, promises);
}

function applySolarPowerRecoil(poke: Pokemon, side: BattleSide, ctx: BattleContext, promises: Promise<void>[]): void {
  if (poke.ability !== 'solarpower' || poke.hp <= 0) return;
  const dmg = Math.max(1, Math.floor(poke.maxHp / SOLAR_POWER_DAMAGE_DIVISOR));
  poke.hp = Math.max(0, poke.hp - dmg);
  ctx.addLog(`¡${poke.name} sufre por el sol ardiente! (-${dmg} HP)`, 'log-info', poke);
  if (ctx.animations?.handleBlinkRequest) {
    promises.push(ctx.animations.handleBlinkRequest({ side }));
  }
}

export async function applyEndTurnWeather(p: Pokemon, e: Pokemon, weather: BattleWeather | null, ctx: BattleContext): Promise<void> {
  if (p?.ability === 'cloudnine' || e?.ability === 'cloudnine') {
    return;
  }
  const mechWeather = getMechanicalWeather(weather?.type);
  const wType = (weather?.visual || weather?.type || '').toLowerCase();
  const weatherLabel = WEATHER_REGISTRY[wType]?.label || 'CLIMA';
  const promises: Promise<void>[] = [];

  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    applySandstormWeather(p, e, weatherLabel, ctx, promises);
  } else if (mechWeather === WEATHER_MECHANICAL.HAIL) {
    applyHailWeather(p, e, weatherLabel, ctx, promises);
  } else if (mechWeather === WEATHER_MECHANICAL.SUN) {
    applySolarPowerRecoil(p, 'player', ctx, promises);
    applySolarPowerRecoil(e, 'enemy', ctx, promises);
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
