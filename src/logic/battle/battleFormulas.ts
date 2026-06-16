/**
 * Battle Formulas Central Manager
 * Bridges the UI-friendly types with the Pure Math Core (battleMath.ts).
 * 
 * Refer to `@/project-standards/references/core/game_formulas_manual.md` for logic details.
 */

import { 
  getEffectiveStat as pureGetEffectiveStat,
  calculateDamagePure,
  calculateCatchRate as pureCalculateCatchRate,
  calculateEscapeChance as pureCalculateEscapeChance,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather,
  type PureBattleStages
} from './battleMath.ts';
import { getDayCycle } from '../utils/timeUtils.ts';
import type { Pokemon, Move } from '@/types/pokemon';
import type { BattleStages, BattleWeather } from '@/types/battle';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

import { useBattleStore } from '@/stores/battle';

import type { DayPhase } from '@/logic/utils/timeUtils';

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
  const resolvedId = m.id || (m.name ? pokemonDataProvider.resolveMoveId(m.name) : '');
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
    if (battleStore.state?.isGym) {
      activeWeather = null;
      isGym = true;
    }
  } catch (e) {
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
    if (battleStore.state?.isGym) {
      activeWeather = null;
      isGym = true;
    }
  } catch (e) {
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
    if ((mechWeather === 'snow' || mechWeather === 'hail') && pTypes.includes('ice')) {
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

  if (statKey === 'atk') {
    if (ab === 'Potencia' || ab === 'Energía pura') abilityMult = 2;
    else if (ab === 'Agallas' && pokemon.status) abilityMult = 1.5;
  }
  if (statKey === 'def') {
    if (ab === 'Escama especial' && pokemon.status) abilityMult = 1.5;
  }
  if (statKey === 'spa') {
    if (ab === 'Poder solar' && isSun) abilityMult = 1.5;
  }
  if (statKey === 'spe') {
    if (ab === 'Clorofila' && isSun) abilityMult = 2;
    else if (ab === 'Nado rápido' && isRain) abilityMult = 2;
    else if (ab === 'Ímpetu arena' && mechWeather === 'sandstorm') abilityMult = 2;
    else if (ab === 'Quitanieves' && (mechWeather === 'snow' || mechWeather === 'hail')) abilityMult = 2;
  }

  let statusMult = 1;
  if (statKey === 'spe' && pokemon.status === 'paralysis') {
    statusMult = 0.5;
  }
  if (statKey === 'atk' && pokemon.status === 'burn' && ab !== 'Agallas') {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    // Pinia not initialized
  }

  return pureCalculateEscapeChance(
    toPurePoke(playerPoke),
    toPurePoke(wildPoke),
    attempts,
    toPureWeather(activeWeather)
  );
}

// Legacy exports for compatibility
export function getAbilityMultiplier(_attacker: Pokemon, _defender: Pokemon, _move: Partial<Move>) {
  return { mult: 1, triggeredAbility: null }; // Simplified, logic is now in battleMath
}

export function getMoveCategory(move: Partial<Move>): 'status' | 'physical' | 'special' {
  if (move.cat === 'status') return 'status';
  const specialTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
  if (move.type && specialTypes.includes(move.type)) return 'special';
  return 'physical';
}
