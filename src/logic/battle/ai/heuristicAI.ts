// ============================================================
// HeuristicAI — main CombatAI implementation
// Replaces StandardAI with a 9-layer heuristic engine.
// One instance per battle (InferenceEngine tracks state).
// ============================================================

import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts';
import type { BattleStages, BattleState } from '../../../types/battle/battle.ts';
import type { BattleContext } from '../../../types/battle/battleContext.ts';
import type { CombatAI } from './combatAI.ts';
import type { AIConfig, HeuristicMoveInfo, HeuristicBattleSnapshot } from './heuristic/types.ts';
import { AI_CONFIG_PRESETS } from './heuristic/types.ts';
import { HeuristicDamageCalculator } from './heuristic/damageCalculator.ts';
import { InferenceEngine } from './heuristic/inferenceEngine.ts';
import { buildSnapshot } from './heuristic/snapshotBuilder.ts';
import { evaluateStrategicState } from './heuristic/strategyEvaluator.ts';
import { heuristicDecision, pickBestSwitch, hasViableSwitchCounter, type SwitchEvaluationMode } from './heuristic/heuristicEngine.ts';
import { getTrainerAIPreset } from '@/data/player/trainerTypes.ts';
import { getActivePinia } from 'pinia';
import { ACTIVE_GENERATION } from '../../../data/system/constants.ts';
import type { GenerationNum } from '@smogon/calc';

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

function resolveConfig(battle: {
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
function pickBestMoveByPower(enemy: Pokemon): Move | null {
  const valid = enemy.moves
    .filter((m): m is Move => !!m && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id));
  if (valid.length === 0) return enemy.moves.find(m => !!m) ?? null;
  return valid.reduce((best, m) => ((m.power ?? 0) > (best.power ?? 0) ? m : best));
}

function getValidMovesFromRequest(enemy: Pokemon, store?: BattleContext): HeuristicMoveInfo[] {
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
      const reqMove = reqMoves.find((r: { id?: string; disabled?: boolean | string; pp?: number }) => r.id === m.id); // type-ok: Type contract declaration
      if (!m.id) throw new Error(`[HeuristicAI] Move is missing an id: ${JSON.stringify(m)}`);
      return {
        id: m.id,
        pp: reqMove?.pp ?? m.pp,
        disabled: !!(reqMove?.disabled),
      };
    })
    .filter(m => !m.disabled && m.pp > 0);
}

function tryWildDittoTransform(enemy: Pokemon, isWildBattle: boolean): Move | null {
  if (isWildBattle && !enemy.isTransformed && enemy.id === 'ditto') {
    const transformMove = enemy.moves.find(m => m && m.id === 'transform' && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id));
    if (transformMove) {
      return transformMove;
    }
  }
  return null;
}

function tryPickRandomMove(enemy: Pokemon, validMoves: HeuristicMoveInfo[], errorRate: number): Move | null {
  const useRandom = Math.random() < errorRate;
  if (useRandom && validMoves.length > 0) {
    const randomId = validMoves[Math.floor(Math.random() * validMoves.length)]!.id;
    return enemy.moves.find(m => m && m.id === randomId) ?? null;
  }
  return null;
}

function extractBattleSnapshot(store: BattleContext | undefined): HeuristicBattleSnapshot | null {
  if (!store) return null;
  try {
    return buildSnapshot(store);
  } catch (_err) {
    return null;
  }
}

function pickHeuristicMoveChoice(
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

function resolvePokemonActiveTurns(
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

function safeBuildSnapshot(store?: BattleContext): HeuristicBattleSnapshot | null {
  if (!store) return null;
  try {
    return buildSnapshot(store);
  } catch {
    return null;
  }
}

function shouldSwitchByDamageMatchup(
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

export class HeuristicAI implements CombatAI {
  private readonly calc = new HeuristicDamageCalculator(ACTIVE_GENERATION as GenerationNum);
  private readonly inference = new InferenceEngine();
  private readonly activeTurnsByUid = new Map<string, number>();
  private readonly entryTurnByUid = new Map<string, number>();

  notifyTurnAdvanced(activeUid: string): void {
    this.activeTurnsByUid.set(activeUid, (this.activeTurnsByUid.get(activeUid) ?? 0) + 1);
  }

  getConfig(store?: BattleContext): AIConfig {
    const battle = store?.activeBattle?.value ?? null;
    return resolveConfig(battle);
  }

  // ──────────────────────────────────────────
  // CombatAI interface
  // ──────────────────────────────────────────

  decideMove(enemy: Pokemon, _player: Pokemon, _playerStages: BattleStages, isWild = false, store?: BattleContext): Move | null {
    const battle = store?.activeBattle?.value ?? null;
    const config = resolveConfig(battle ? { ...battle, isWild } : { isWild });
    const isWildBattle = isWild || Boolean(battle && !battle.isTrainer && !battle.isGym && !battle.isPvP);

    const dittoMove = tryWildDittoTransform(enemy, isWildBattle);
    if (dittoMove) return dittoMove;

    const validMoves = getValidMovesFromRequest(enemy, store);
    if (validMoves.length === 0) return null;

    const randomMove = tryPickRandomMove(enemy, validMoves, config.errorRate);
    if (randomMove) return randomMove;

    const snapshot = extractBattleSnapshot(store);
    if (!snapshot) {
      return pickBestMoveByPower(enemy);
    }

    return pickHeuristicMoveChoice(snapshot, validMoves, config, enemy, this.calc, this.inference);
  }

  shouldSwitch(_enemy: Pokemon, _player: Pokemon, enemyTeam: Pokemon[] | undefined, store?: BattleContext): boolean {
    if (!enemyTeam || enemyTeam.filter(p => p.hp > 0).length <= 1) return false;

    const battle = store?.activeBattle?.value ?? null;
    const config = resolveConfig(battle);

    // Wilds and novice trainers don't switch mid-turn
    if (config.switchAggressiveness === 0.0) return false;

    // Check anti-ping-pong cooldown: a newly entered Pokémon cannot switch immediately
    const activeTurns = resolvePokemonActiveTurns(
      this.entryTurnByUid,
      this.activeTurnsByUid,
      _enemy.uid,
      store?.activeBattle?.value?.turnCount
    );

    if (activeTurns < config.switchCooldownTurns) return false;

    const snapshot = safeBuildSnapshot(store);

    if (!snapshot) return false;

    const switchOptions = snapshot.mySide.pokemon.filter((p: HeuristicBattleSnapshot['mySide']['pokemon'][number]) => !p.active && p.hp > 0);
    const oppActive = snapshot.opponentSide.activePokemon;

    // Crucial anti-loop gate: NEVER switch if no bench Pokémon is a viable safe counter!
    if (!oppActive || !hasViableSwitchCounter(snapshot, switchOptions, this.calc, this.inference, oppActive)) {
      return false;
    }

    return shouldSwitchByDamageMatchup(snapshot, this.calc, config);
  }

  findBestSwitchIndex(
    enemyTeam: Pokemon[],
    _player: Pokemon,
    currentEnemyUid: string,
    store?: BattleContext,
    mode: SwitchEvaluationMode = 'counter'
  ): number {
    let snapshot;
    try {
      snapshot = store ? buildSnapshot(store) : null;
    } catch {
      return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);
    }

    if (!snapshot) return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);

    const oppActive = snapshot.opponentSide.activePokemon;
    if (!oppActive) return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);

    const candidates = snapshot.mySide.pokemon.filter((p) => !p.active && p.hp > 0);
    const strategic = evaluateStrategicState(snapshot, this.calc, this.inference);
    const decision = pickBestSwitch(snapshot, candidates, strategic, this.calc, this.inference, oppActive, mode);

    if (decision?.type === 'switch' && decision.switchTeamIndex !== undefined) {
      // Map heuristic team index back to the project's enemyTeam array
      const heuristicPoke = snapshot.mySide.pokemon[decision.switchTeamIndex];
      if (heuristicPoke) {
        const idx = enemyTeam.findIndex(p => p.hp > 0 && p.uid !== currentEnemyUid && (p.nickname || p.name) === heuristicPoke.name);
        if (idx !== -1) return idx;
      }
    }

    return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);
  }

  async evaluateAndUseItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
    const { evaluateAndUseItem } = await import('./heuristic/aiItemEvaluator.ts')
    return evaluateAndUseItem(ctx, e)
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private fallbackSwitchIndex(enemyTeam: Pokemon[], currentEnemyUid: string): number {
    const idx = enemyTeam.findIndex(p => p.hp > 0 && p.uid !== currentEnemyUid);
    return idx;
  }
}
