// ============================================================
// HeuristicAI — main CombatAI implementation
// Replaces StandardAI with a 9-layer heuristic engine.
// One instance per battle (InferenceEngine tracks state).
// ============================================================

import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts';
import type { BattleStages } from '../../../types/battle/battle.ts';
import type { BattleContext } from '../../../types/battle/battleContext.ts';
import type { CombatAI } from './combatAI.ts';
import type { AIConfig, HeuristicBattleSnapshot } from './heuristic/types.ts';
import { HeuristicDamageCalculator } from './heuristic/damageCalculator.ts';
import { InferenceEngine } from './heuristic/inferenceEngine.ts';
import { buildSnapshot } from './heuristic/snapshotBuilder.ts';
import { evaluateStrategicState } from './heuristic/strategyEvaluator.ts';
import { pickBestSwitch, hasViableSwitchCounter, type SwitchEvaluationMode } from './heuristic/heuristicEngine.ts';
import { ACTIVE_GENERATION } from '../../../data/system/constants.ts';
import type { GenerationNum } from '@smogon/calc';
import {
  resolveAIConfig,
  pickBestMoveByPower,
  getValidMovesFromRequest,
  tryWildDittoTransform,
  tryPickRandomMove,
  extractBattleSnapshot,
  pickHeuristicMoveChoice,
  resolvePokemonActiveTurns,
  shouldSwitchByDamageMatchup
} from './heuristic/heuristicExecutionHelpers.ts';

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
    return resolveAIConfig(battle);
  }

  // ──────────────────────────────────────────
  // CombatAI interface
  // ──────────────────────────────────────────

  decideMove(enemy: Pokemon, _player: Pokemon, _playerStages: BattleStages, isWild = false, store?: BattleContext): Move | null {
    const battle = store?.activeBattle?.value ?? null;
    const config = resolveAIConfig(battle ? { ...battle, isWild } : { isWild });
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
    const config = resolveAIConfig(battle);

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

    const snapshot = extractBattleSnapshot(store);

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
    const { evaluateAndUseItem } = await import('./heuristic/aiItemEvaluator.ts');
    return evaluateAndUseItem(ctx, e);
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private fallbackSwitchIndex(enemyTeam: Pokemon[], currentEnemyUid: string): number {
    const idx = enemyTeam.findIndex(p => p.hp > 0 && p.uid !== currentEnemyUid);
    return idx;
  }
}
