/**
 * Battle Formulas Central Manager
 * Bridges the UI-friendly types with the Pure Math Core (battleMath.ts).
 * 
 * Refer to `@/project-standards/references/core/game_formulas_manual.md` for logic details.
 */
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { getDayCycle } from '@/logic/utils/timeUtils.ts';

import { 
  getEffectiveStatPure as pureGetEffectiveStat,
  calculateDamagePure,
  type PurePokemon,
  type PureMove,
  type PureBattleWeather,
  type PureBattleStages
} from './battleMath.ts';
import {
  calculateCatchRatePure as pureCalculateCatchRate,
  calculateEscapeChancePure as pureCalculateEscapeChance
} from './battleCatchMath.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleStages, BattleWeather, BattleConditionKey, BattleTimedCondition } from '@/types/battle/battle';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { ItemId } from '@/data/inventory/items';
import { isStatIdExceptHP, type StatIDExceptHP } from '@/logic/pokemon/statsMath';

export interface BattleFormulasContext {
  isGym?: boolean;
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
}

type BattleFormulasResolver = () => BattleFormulasContext | null | undefined;

let contextResolver: BattleFormulasResolver | null = null; // singleton-ok: Singleton instance state container

export function registerBattleFormulasContextResolver(resolver: BattleFormulasResolver): void {
  contextResolver = resolver;
}

function getAmbientBattleContext(): BattleFormulasContext | null { // result-ok: Operation result wrapper payload
  if (contextResolver) {
    try {
      return contextResolver() ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

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
  pokedexCount?: number;
  forceCritical?: boolean;
  playerClass?: string | null;
  activeTeam?: { type1: string; type2?: string | null }[];
  ivTotal?: number;
}

export interface EscapeOptions {
  playerStages?: Partial<BattleStages>;
  enemyStages?: Partial<BattleStages>;
  weather?: BattleWeather | null;
}

// ── Bridge Helpers ──────────────────────────────────────────────────────────

function toPurePoke(p: Pokemon): PurePokemon {
  return p as PurePokemon; // domain-ok: Open dynamic text or non-domain string payload
}

function toPureMove(m: Partial<Move>): PureMove {
  return {
    id: m.id || undefined,
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
  const ambient = getAmbientBattleContext();
  const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
  if (ambient?.isGym && !isMoveWeather) {
    activeWeather = null;
    isGym = true;
  } else if (ambient?.isGym) {
    isGym = true;
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

import { calculateDetailedStatBreakdown } from './statBreakdownHelper.ts';

export function getStatBreakdown(pokemon: Pokemon, statKey: StatIDExceptHP | keyof Pokemon, stages: Partial<BattleStages>, weather: BattleWeather | null) {
  let activeWeather = weather
  let isGym = false
  let fieldConditions: Record<string, unknown> = {}
  const ambient = getAmbientBattleContext()
  const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1)
  if (ambient?.isGym && !isMoveWeather) {
    activeWeather = null
    isGym = true
  } else if (ambient?.isGym) {
    isGym = true
  }
  if (ambient?.fieldConditions) {
    fieldConditions = ambient.fieldConditions
  }

  const validStatKey: StatIDExceptHP = typeof statKey === 'string' && isStatIdExceptHP(statKey)
    ? statKey
    : 'atk'

  const breakdown = calculateDetailedStatBreakdown(
    toPurePoke(pokemon),
    validStatKey,
    stages as PureBattleStages,
    toPureWeather(activeWeather),
    {
      isGym,
      dayCycle: getDayCycle(),
      fieldConditions
    }
  )

  return {
    base: breakdown.base,
    final: breakdown.final,
    stage: breakdown.stage,
    stageMult: breakdown.stageMult,
    weatherMult: breakdown.weatherMult,
    abilityMult: breakdown.abilityMult,
    itemMult: breakdown.itemMult,
    statusMult: breakdown.statusMult,
    fieldMult: breakdown.fieldMult,
    isUp: breakdown.isUp,
    isDown: breakdown.isDown,
    sources: breakdown.sources
  }
}

export function calculateDamage(attacker: Pokemon, defender: Pokemon, move: Partial<Move>, ctx: DamageOptions = {}) {
  let activeWeather = ctx.weather;
  let isGym = ctx.isGym ?? false;
  const ambient = getAmbientBattleContext();
  if (ambient?.isGym) {
    activeWeather = null;
    isGym = true;
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

export function calculateCatchRate(pokemon: Pokemon, rawBallType: ItemId = 'pokeball', eventCatchMult = 1, ctx: CatchOptions = {}) {
  let activeWeather = ctx.weather;
  const ambient = getAmbientBattleContext();
  if (ambient?.isGym) {
    activeWeather = null;
  }

  return pureCalculateCatchRate(
    toPurePoke(pokemon),
    rawBallType,
    eventCatchMult,
    { 
      weather: toPureWeather(activeWeather),
      turnCount: ctx.turnCount,
      cycle: ctx.cycle || getDayCycle(),
      isCave: ctx.isCave,
      pokedexCount: ctx.pokedexCount,
      forceCritical: ctx.forceCritical,
      playerClass: ctx.playerClass,
      activeTeam: ctx.activeTeam,
      ivTotal: ctx.ivTotal
    }
  );
}

export function calculateEscapeChance(playerPoke: Pokemon, wildPoke: Pokemon, attempts: number, ctx: EscapeOptions = {}) {
  let activeWeather = ctx.weather;
  const ambient = getAmbientBattleContext();
  if (ambient?.isGym) {
    activeWeather = null;
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

import type { PokemonType } from '@/data/battle/types';
import type { MoveCategory } from '@/data/battle/moves';

const SPECIAL_TYPES_GEN3: readonly PokemonType[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];

export function getMoveCategory(move: Partial<Move>): MoveCategory {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    if (move.type && SPECIAL_TYPES_GEN3.includes(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
}
