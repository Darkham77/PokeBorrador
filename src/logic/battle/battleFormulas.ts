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
import { getDayCycle } from '../timeUtils.ts';
import type { Pokemon, Move } from '@/types/pokemon';
import type { BattleStages, BattleWeather } from '@/types/battle';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

export interface DamageOptions {
  atkStages?: number;
  defStages?: number;
  weather?: BattleWeather | null;
  magnitudeSet?: boolean;
}

export interface CatchOptions {
  weather?: BattleWeather | null;
  turnCount?: number;
  cycle?: string;
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
  return pureGetEffectiveStat(
    toPurePoke(pokemon),
    statKey as keyof PurePokemon,
    stages as PureBattleStages,
    toPureWeather(weather),
    getDayCycle()
  );
}

/**
 * Detailed breakdown for UI tooltips.
 */
export function getStatBreakdown(pokemon: Pokemon, statKey: keyof Pokemon, stages: Partial<BattleStages>, weather: BattleWeather | null) {
  const final = getEffectiveStat(pokemon, statKey, stages, weather);
  const base = (pokemon[statKey] as number) || 10;
  
  return {
    base,
    final,
    weatherMult: final > base ? 1.5 : (final < base ? 0.5 : 1), // Simplified for UI
    stageMult: 1, // Detailed stage math is inside battleMath
    statusMult: 1,
    abilityMult: 1
  };
}

export function calculateDamage(attacker: Pokemon, defender: Pokemon, move: Partial<Move>, ctx: DamageOptions = {}) {
  const pureRes = calculateDamagePure(
    toPurePoke(attacker),
    toPurePoke(defender),
    toPureMove(move),
    { 
      weather: toPureWeather(ctx.weather),
      atkStages: ctx.atkStages,
      defStages: ctx.defStages
    },
    getDayCycle()
  );

  return {
    ...pureRes,
    dmg: pureRes.dmg,
    isNoEffect: pureRes.eff === 0
  };
}

export function calculateCatchRate(pokemon: Pokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: CatchOptions = {}) {
  return pureCalculateCatchRate(
    toPurePoke(pokemon),
    rawBallType,
    eventCatchMult,
    { 
      weather: toPureWeather(ctx.weather),
      turnCount: ctx.turnCount,
      cycle: ctx.cycle || getDayCycle(),
      isCave: ctx.isCave
    }
  );
}

export function calculateEscapeChance(playerPoke: Pokemon, wildPoke: Pokemon, attempts: number, ctx: EscapeOptions = {}) {
  return pureCalculateEscapeChance(
    toPurePoke(playerPoke),
    toPurePoke(wildPoke),
    attempts,
    toPureWeather(ctx.weather)
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
