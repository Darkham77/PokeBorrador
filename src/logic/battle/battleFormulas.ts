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
import type { BattleStages, BattleWeather } from '@/types/battle/battle';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { ItemId } from '@/data/inventory/items';
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

import { isStatIdExceptHP, type StatIDExceptHP } from '@/logic/pokemon/statsMath';
import { calculateDetailedStatBreakdown } from './statBreakdownHelper.ts';

export function getStatBreakdown(pokemon: Pokemon, statKey: StatIDExceptHP | keyof Pokemon, stages: Partial<BattleStages>, weather: BattleWeather | null) {
  let activeWeather = weather
  let isGym = false
  let fieldConditions: Record<string, unknown> = {}
  try {
    const battleStore = useBattleStore()
    const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1)
    if (battleStore.state?.isGym && !isMoveWeather) {
      activeWeather = null
      isGym = true
    } else if (battleStore.state?.isGym) {
      isGym = true
    }
    if (battleStore.state?.fieldConditions) {
      fieldConditions = battleStore.state.fieldConditions
    }
  } catch {
    // Pinia not initialized
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

export function calculateCatchRate(pokemon: Pokemon, rawBallType: ItemId = 'pokeball', eventCatchMult = 1, ctx: CatchOptions = {}) {
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
