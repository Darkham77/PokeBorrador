import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts';
import type { BattleState } from '../../../types/battle/battle.ts';
import type { BattleContext } from '../../../types/battle/battleContext.ts';
import type { AIConfig, HeuristicMoveInfo, HeuristicBattleSnapshot } from './types.ts';
import { AI_CONFIG_PRESETS } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import { buildSnapshot } from './snapshotBuilder.ts';
import { evaluateStrategicState } from './strategyEvaluator.ts';
import { heuristicDecision } from './heuristicEngine.ts';
import { getTrainerAIPreset } from '@/data/player/trainerTypes.ts';
import { getActivePinia } from 'pinia';

interface InternalPiniaStore {
  state?: {
    enemyRequest?: BattleState['enemyRequest'];
  };
}

interface InternalPiniaWithStores {
  _s: Map<string, InternalPiniaStore>;
}

function hasInternalStores(pinia: object | null | undefined): pinia is InternalPiniaWithStores {
  return Boolean(pinia && '_s' in pinia && (pinia as { _s?: unknown })._s instanceof Map);
}

const LOW_OFFENSIVE_DAMAGE_THRESHOLD_PERCENT = 30;
const BASE_SWITCH_THRESHOLD_PERCENT = 50;
const SWITCH_AGGRESSIVENESS_SCALE = 25;

export function resolveAIConfig(battle: {
  isWild?: boolean;
  isGym?: boolean;
  isRival?: boolean;
  trainerArchetype?: string;
  isPvP?: boolean;
  isAsynchronous?: boolean;
  isRanked?: boolean;
} | null): AIConfig {
  if (!battle) return AI_CONFIG_PRESETS.intermediate;
  if (battle.isWild) return AI_CONFIG_PRESETS.wild;
  if (battle.isRival || battle.trainerArchetype === 'rival' || (battle.isPvP && (battle.isAsynchronous || battle.isRanked))) {
    return AI_CONFIG_PRESETS.rival;
  }
  if (battle.isGym) return AI_CONFIG_PRESETS.gym;
  if (battle.trainerArchetype) {
    const presetKey = getTrainerAIPreset(battle.trainerArchetype);
    return AI_CONFIG_PRESETS[presetKey] ?? AI_CONFIG_PRESETS.intermediate;
  }
  return AI_CONFIG_PRESETS.intermediate;
}

/** Picks the highest base-power valid move, respecting disabledMove and pp. Used when no snapshot is available. */
export function pickBestMoveByPower(enemy: Pokemon): Move | null {
  const valid = enemy.moves
    .filter((m): m is Move => !!m && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id));
  if (valid.length === 0) return enemy.moves.find(m => !!m) ?? null;
  return valid.reduce((best, m) => ((m.power ?? 0) > (best.power ?? 0) ? m : best));
}

interface HeuristicRequestMove {
  id?: string;
  disabled?: boolean | string;
  pp?: number;
}

export function getValidMovesFromRequest(enemy: Pokemon, store?: BattleContext): HeuristicMoveInfo[] {
  let enemyRequest = store?.activeBattle?.value?.enemyRequest;
  if (!enemyRequest) {
    const pinia = getActivePinia();
    if (hasInternalStores(pinia)) {
      enemyRequest = pinia._s.get('battle')?.state?.enemyRequest;
    }
  }
  const reqMoves = enemyRequest?.active?.[0]?.moves ?? [];

  return enemy.moves
    .filter((m): m is Move => !!m && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id))
    .map(m => {
      const reqMove = reqMoves.find((r: HeuristicRequestMove) => r.id === m.id);
      if (!m.id) throw new Error(`[HeuristicAI] Move is missing an id: ${JSON.stringify(m)}`);
      return {
        id: m.id,
        pp: reqMove?.pp ?? m.pp,
        disabled: !!(reqMove?.disabled),
      };
    })
    .filter(m => !m.disabled && m.pp > 0);
}

export function tryWildDittoTransform(enemy: Pokemon, isWildBattle: boolean): Move | null {
  if (isWildBattle && !enemy.isTransformed && enemy.id === 'ditto') {
    const transformMove = enemy.moves.find(m => m && m.id === 'transform' && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id));
    if (transformMove) {
      return transformMove;
    }
  }
  return null;
}

export function tryPickRandomMove(enemy: Pokemon, validMoves: HeuristicMoveInfo[], errorRate: number): Move | null {
  const useRandom = Math.random() < errorRate;
  if (useRandom && validMoves.length > 0) {
    const randomId = validMoves[Math.floor(Math.random() * validMoves.length)]!.id;
    return enemy.moves.find(m => m && m.id === randomId) ?? null;
  }
  return null;
}

export function extractBattleSnapshot(store: BattleContext | undefined): HeuristicBattleSnapshot | null {
  if (!store) return null;
  try {
    return buildSnapshot(store);
  } catch (_err) {
    return null;
  }
}

export function pickHeuristicMoveChoice(
  snapshot: HeuristicBattleSnapshot,
  validMoves: HeuristicMoveInfo[],
  config: AIConfig,
  enemy: Pokemon,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine
): Move | null {
  if (config.useInference) inference.update(snapshot);

  const inferredMoves = config.useInference ? inference.getActiveOpponentMoves(snapshot) : undefined;
  const matchup = calc.calcMatchup(snapshot, validMoves, inferredMoves);

  const strategic = config.useStrategicEval
    ? evaluateStrategicState(snapshot, calc, inference)
    : { winConditions: [], threats: [], position: { score: 0, factors: { pokemonAdvantage: 0, hpAdvantage: 0, hazardAdvantage: 0, speedAdvantage: 0, typeMatchupAdvantage: 0, statusAdvantage: 0, winConditionViability: 0 } }, sackOrder: [] };

  const switchOptions = snapshot.mySide.pokemon.filter((p) => !p.active && p.hp > 0);
  const isTrapped = Boolean(snapshot.mySide.activePokemon?.volatiles.has('trapped') || snapshot.mySide.activePokemon?.volatiles.has('ingrain'));

  const decision = heuristicDecision(snapshot, matchup, strategic, validMoves, switchOptions, calc, inference, isTrapped);

  if (!decision || decision.type !== 'move') {
    const bestDmgMove = matchup.myAttacking[0];
    if (bestDmgMove !== undefined) {
      const found = enemy.moves.find((m: Move | null) => m && m.id === bestDmgMove.move);
      if (found) return found;
    }
    return enemy.moves.find((m: Move | null) => Boolean(m)) ?? null;
  }

  const targetId = decision.moveId;
  if (!targetId) return enemy.moves.find((m: Move | null) => Boolean(m)) ?? null;
  return enemy.moves.find((m: Move | null) => m && m.id === targetId)
    ?? enemy.moves.find((m: Move | null) => Boolean(m))
    ?? null;
}

export function resolvePokemonActiveTurns(
  entryTurnByUid: Map<string, number>,
  activeTurnsByUid: Map<string, number>,
  currentUid: string,
  battleTurn?: number
): number {
  const cached = activeTurnsByUid.get(currentUid);
  if (cached !== undefined) return cached;
  if (typeof battleTurn === 'number') {
    if (!entryTurnByUid.has(currentUid)) {
      entryTurnByUid.set(currentUid, battleTurn);
    }
    return battleTurn - (entryTurnByUid.get(currentUid) ?? battleTurn);
  }
  return 0;
}

export function shouldSwitchByDamageMatchup(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  config: AIConfig
): boolean {
  const activeMoves: HeuristicMoveInfo[] = snapshot.mySide.activePokemon?.moves.map((m) => ({ id: m.id, pp: 1, disabled: false })) ?? [];
  const matchup = calc.calcMatchup(snapshot, activeMoves);
  const bestOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
  const bestMyDmg = matchup.myAttacking[0]?.maxPercent ?? 0;

  // Scale switch threshold by aggressiveness
  const switchThreshold = BASE_SWITCH_THRESHOLD_PERCENT - config.switchAggressiveness * SWITCH_AGGRESSIVENESS_SCALE;
  return bestOppDmg > switchThreshold && bestMyDmg < LOW_OFFENSIVE_DAMAGE_THRESHOLD_PERCENT && Math.random() < config.switchAggressiveness;
}
