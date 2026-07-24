/**
 * Battle Formulas Central Manager
 * Bridges the UI-friendly types with the Pure Math Core (battleMath.ts).
 * 
 * Refer to `@/project-standards/references/core/game_formulas_manual.md` for logic details.
 */
import { toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '@/data/system/constants';

import { 
  getEffectiveStatPure as pureGetEffectiveStat,
  calculateDamagePure,
  calculateCatchRatePure as pureCalculateCatchRate,
  calculateEscapeChancePure as pureCalculateEscapeChance,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather,
  type PureBattleStages
} from './battleMath.ts';
import { getDayCycle } from '../utils/timeUtils.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleStages, BattleWeather } from '@/types/battle/battle';
import type { DayPhase } from '@/logic/utils/timeUtils';
import { useBattleStore } from '@/stores/battle/battle';

export interface DamageOptions {
  atkStages?: number;
  defStages?: number;
  weather?: BattleWeather | null;
  magnitudeSet?: boolean;
  cycle?: DayPhase;
  isGym?: boolean;
}

export interface CatchOptions {
  weather?: BattleWeather | null;
  turnCount?: number;
  cycle?: DayPhase;
  isCave?: boolean;
}

export interface EscapeOptions {
  playerStages?: Partial<BattleStages>;
  enemyStages?: Partial<BattleStages>;
  weather?: BattleWeather | null;
}

// ── Bridge Helpers ──────────────────────────────────────────────────────────

function toPurePoke(p: Pokemon): PurePokemon {
  return p as unknown as PurePokemon; // Structurally compatible
}

function toPureMove(m: Partial<Move>): PureMove {
  const resolvedId = m.id || '';
  return {
    id: resolvedId,
    type: m.type || 'normal',
    power: m.power || 0,
    cat: m.cat || 'physical'
  };
}

function toPureWeather(w: BattleWeather | null | undefined): PureBattleWeather | null {
  if (!w) return null;
  return { type: w.type, turns: w.turns };
}

// ── Exported Functions ───────────────────────────────────────────────────────

export function getEffectiveStat(pokemon: Pokemon, statKey: keyof Pokemon, stages: Partial<BattleStages>, weather: BattleWeather | null) {
  let activeWeather = weather;
  let isGym = false;
  try {
    const battleStore = useBattleStore();
    const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
    if (battleStore.state?.isGym && !isMoveWeather) {
      activeWeather = null;
      isGym = true;
    } else if (battleStore.state?.isGym) {
      isGym = true;
    }
  } catch {
    // Pinia not initialized or similar
  }

  return pureGetEffectiveStat(
    toPurePoke(pokemon),
    statKey as keyof PurePokemon,
    stages as PureBattleStages,
    toPureWeather(activeWeather),
    getDayCycle(),
    isGym
  );
}

export function getStatBreakdown(pokemon: Pokemon, statKey: keyof Pokemon, stages: Partial<BattleStages>, weather: BattleWeather | null) {
  let activeWeather = weather;
  let isGym = false;
  try {
    const battleStore = useBattleStore();
    const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
    if (battleStore.state?.isGym && !isMoveWeather) {
      activeWeather = null;
      isGym = true;
    } else if (battleStore.state?.isGym) {
      isGym = true;
    }
  } catch {
    // Pinia not initialized
  }

  const final = getEffectiveStat(pokemon, statKey, stages, activeWeather);
  
  let base = (pokemon[statKey] as number) || 10;
  if (statKey === 'spa' && !pokemon.spa) base = pokemon.atk ?? 10;
  if (statKey === 'spd' && !pokemon.spd) base = pokemon.def ?? 10;

  const wType = activeWeather?.type ? activeWeather.type.toLowerCase() : 'clear';
  const pTypes = [pokemon.type?.toLowerCase(), pokemon.type2?.toLowerCase()];
  
  const WEATHER_MAP: Record<string, string> = {
    sun: 'sun', heatwave: 'sun', intense_sun: 'sun',
    rain: 'rain', storm: 'rain', heavy_rain: 'rain',
    sandstorm: 'sandstorm', dust_storm: 'sandstorm',
    snow: 'snow', hail: 'hail', blizzard: 'hail',
    fog: 'fog', mist: 'fog',
    wind: 'wind', strong_winds: 'wind',
    clear: 'clear', thunderstorm: 'clear'
  };
  const mechWeather = WEATHER_MAP[wType] || 'clear';

  let weatherMult = 1;
  if (statKey === 'def') {
    const isSnowBoost = mechWeather === 'snow' || (mechWeather === 'hail' && ACTIVE_GENERATION >= 9);
    if (isSnowBoost && pTypes.includes('ice')) {
      weatherMult = 1.5;
    }
  }
  if (statKey === 'spd') {
    if (mechWeather === 'sandstorm' && pTypes.includes('rock')) {
      weatherMult = 1.5;
    }
  }
  if (statKey === 'spe') {
    if (wType === 'coldwave' && !pTypes.includes('ice')) {
      weatherMult = 0.5;
    }
  }

  const stage = Math.max(-6, Math.min(6, (stages[statKey as keyof BattleStages] as number) || 0));
  const stageMult = stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);

  let abilityMult = 1;
  const ab = pokemon.ability;
  const activeCycle = getDayCycle();
  const isSun = !isGym && (mechWeather === 'sun' || (mechWeather === 'clear' && (activeCycle === 'day' || activeCycle === 'morning')));
  const isRain = !isGym && (mechWeather === 'rain' || (mechWeather === 'clear' && (activeCycle === 'night' || activeCycle === 'dusk')));

  const abId = ab ? toID(ab) : '';
  if (statKey === 'atk') {
    if (abId === 'hugepower' || abId === 'purepower') abilityMult = 2;
    else if (abId === 'guts' && pokemon.status) abilityMult = 1.5;
  }
  if (statKey === 'def') {
    if (abId === 'marvelscale' && pokemon.status) abilityMult = 1.5;
  }
  if (statKey === 'spa') {
    if (abId === 'solarpower' && isSun) abilityMult = 1.5;
  }
  if (statKey === 'spe') {
    if (abId === 'chlorophyll' && isSun) abilityMult = 2;
    else if (abId === 'swiftswim' && isRain) abilityMult = 2;
    else if (abId === 'sandrush' && mechWeather === 'sandstorm') abilityMult = 2;
    else if (abId === 'slushrush' && (mechWeather === 'snow' || mechWeather === 'hail')) abilityMult = 2;
  }

  let statusMult = 1;
  if (statKey === 'spe' && pokemon.status === 'par') {
    // Parálisis en Gen 3 a 6 reduce a 1/4 (0.25). En Gen 7+ a 1/2 (0.5).
    statusMult = ACTIVE_GENERATION <= 6 ? 0.25 : 0.5;
  }
  if (statKey === 'atk' && pokemon.status === 'brn' && abId !== 'guts') {
    statusMult = 0.5;
  }

  return {
    base,
    final,
    weatherMult,
    stageMult,
    statusMult,
    abilityMult
  };
}

export function calculateDamage(attacker: Pokemon, defender: Pokemon, move: Partial<Move>, ctx: DamageOptions = {}) {
  let activeWeather = ctx.weather;
  let isGym = false;
  try {
    const battleStore = useBattleStore();
    if (battleStore.state?.isGym) {
      activeWeather = null;
      isGym = true;
    }
  } catch {
    // Pinia not initialized
  }

  const pureRes = calculateDamagePure(
    toPurePoke(attacker),
    toPurePoke(defender),
    toPureMove(move),
    { 
      weather: toPureWeather(activeWeather),
      atkStages: ctx.atkStages,
      defStages: ctx.defStages,
      isGym
    },
    ctx.cycle || getDayCycle()
  );

  return {
    ...pureRes,
    dmg: pureRes.dmg,
    isNoEffect: pureRes.eff === 0
  };
}

export function calculateCatchRate(pokemon: Pokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: CatchOptions = {}) {
  let activeWeather = ctx.weather;
  try {
    const battleStore = useBattleStore();
    if (battleStore.state?.isGym) {
      activeWeather = null;
    }
  } catch {
    // Pinia not initialized
  }

  return pureCalculateCatchRate(
    toPurePoke(pokemon),
    rawBallType,
    eventCatchMult,
    { 
      weather: toPureWeather(activeWeather),
      turnCount: ctx.turnCount,
      cycle: ctx.cycle || getDayCycle(),
      isCave: ctx.isCave
    }
  );
}

export function calculateEscapeChance(playerPoke: Pokemon, wildPoke: Pokemon, attempts: number, ctx: EscapeOptions = {}) {
  let activeWeather = ctx.weather;
  try {
    const battleStore = useBattleStore();
    if (battleStore.state?.isGym) {
      activeWeather = null;
    }
  } catch {
    // Pinia not initialized
  }

  return pureCalculateEscapeChance(
    toPurePoke(playerPoke),
    toPurePoke(wildPoke),
    attempts,
    toPureWeather(activeWeather),
    ctx.playerStages || {},
    ctx.enemyStages || {}
  );
}

// Legacy exports for compatibility
export function getAbilityMultiplier(_attacker: Pokemon, _defender: Pokemon, _move: Partial<Move>) {
  return { mult: 1, triggeredAbility: null }; // Simplified, logic is now in battleMath
}

export function getMoveCategory(move: Partial<Move>): 'status' | 'physical' | 'special' {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    const specialTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
    if (move.type && specialTypes.includes(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
}
