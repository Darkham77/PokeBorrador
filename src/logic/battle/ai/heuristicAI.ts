// ============================================================
// HeuristicAI — main CombatAI implementation
// Replaces StandardAI with a 9-layer heuristic engine.
// One instance per battle (InferenceEngine tracks state).
// ============================================================

import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts';
import type { BattleStages } from '../../../types/battle/battle.ts';
import type { BattleContext } from '../../../types/battle/battleContext.ts';
import type { CombatAI } from './combatAI.ts';
import type { AIConfig, HeuristicMoveInfo } from './heuristic/types.ts';
import { AI_CONFIG_PRESETS } from './heuristic/types.ts';
import { HeuristicDamageCalculator } from './heuristic/damageCalculator.ts';
import { InferenceEngine } from './heuristic/inferenceEngine.ts';
import { buildSnapshot } from './heuristic/snapshotBuilder.ts';
import { evaluateStrategicState } from './heuristic/strategyEvaluator.ts';
import { heuristicDecision, pickBestSwitch } from './heuristic/heuristicEngine.ts';
import { useBattleStore } from '@/stores/battle/battle';

function resolveConfig(battle: { isWild?: boolean; isGym?: boolean; isRival?: boolean; trainerArchetype?: string } | null): AIConfig {
  if (!battle) return AI_CONFIG_PRESETS.npc;
  if (battle.isWild) return AI_CONFIG_PRESETS.wild;
  if (battle.isRival || battle.trainerArchetype === 'rival') return AI_CONFIG_PRESETS.rival;
  if (battle.isGym) return AI_CONFIG_PRESETS.gym;
  return AI_CONFIG_PRESETS.npc;
}

/** Picks the highest base-power valid move, respecting disabledMove and pp. Used when no snapshot is available. */
function pickBestMoveByPower(enemy: Pokemon): Move | null {
  const valid = enemy.moves
    .filter((m): m is Move => !!m && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id));
  if (valid.length === 0) return enemy.moves.find(m => !!m) ?? null;
  return valid.reduce((best, m) => ((m.power ?? 0) > (best.power ?? 0) ? m : best));
}

function getValidMovesFromRequest(enemy: Pokemon, store?: BattleContext): HeuristicMoveInfo[] {
  const enemyRequest = store?.activeBattle?.value?.enemyRequest ?? useBattleStore().state?.enemyRequest;
  const reqMoves = enemyRequest?.active?.[0]?.moves ?? [];

  return enemy.moves
    .filter((m): m is Move => !!m && m.pp > 0 && !(enemy.disabledMove && m.id === enemy.disabledMove.id))
    .map(m => {
      const reqMove = reqMoves.find((r: { id?: string; disabled?: boolean | string; pp?: number }) => r.id === m.id);
      if (!m.id) throw new Error(`[HeuristicAI] Move is missing an id: ${JSON.stringify(m)}`);
      return {
        id: m.id,
        pp: reqMove?.pp ?? m.pp,
        disabled: !!(reqMove?.disabled),
      };
    })
    .filter(m => !m.disabled && m.pp > 0);
}

export class HeuristicAI implements CombatAI {
  private readonly calc = new HeuristicDamageCalculator();
  private readonly inference = new InferenceEngine();

  // ──────────────────────────────────────────
  // CombatAI interface
  // ──────────────────────────────────────────

  decideMove(enemy: Pokemon, _player: Pokemon, _playerStages: BattleStages, isWild = false, store?: BattleContext): Move | null {
    const battle = store?.activeBattle?.value ?? null;
    const config = resolveConfig(battle ? { ...battle, isWild } : { isWild });

    // Wild Pokémon: apply errorRate=50% directly (full random vs heuristic)
    const useRandom = Math.random() < config.errorRate;
    const validMoves = getValidMovesFromRequest(enemy, store);
    if (validMoves.length === 0) return null;

    if (useRandom) {
      const randomId = validMoves[Math.floor(Math.random() * validMoves.length)]!.id;
      return enemy.moves.find(m => m && m.id === randomId) ?? null;
    }

    // Build snapshot for heuristic engine.
    // buildSnapshot throws if playerRequest/enemyRequest is null — expected on turn 1
    // or during a forced-switch turn before Showdown has emitted the next request.
    // Degrade gracefully: pick the highest-power non-disabled move available.
    let snapshot;
    try {
      snapshot = store ? buildSnapshot(store) : null;
    } catch (_err) {
      return pickBestMoveByPower(enemy);
    }

    if (!snapshot) {
      // No store context (e.g. unit test, wild battle init) — pick by power
      return pickBestMoveByPower(enemy);
    }

    // Update inference engine with revealed information
    if (config.useInference) this.inference.update(snapshot);

    // Calculate damage matchup
    const inferredMoves = config.useInference ? this.inference.getActiveOpponentMoves(snapshot) : undefined;
    const matchup = this.calc.calcMatchup(snapshot, validMoves, inferredMoves);

    // Strategic evaluation (win conditions, threats, position, sack order)
    const strategic = config.useStrategicEval
      ? evaluateStrategicState(snapshot, this.calc, this.inference)
      : { winConditions: [], threats: [], position: { score: 0, factors: { pokemonAdvantage: 0, hpAdvantage: 0, hazardAdvantage: 0, speedAdvantage: 0, typeMatchupAdvantage: 0, statusAdvantage: 0, winConditionViability: 0 } }, sackOrder: [] };

    // Alive non-active team members (switch candidates)
    const switchOptions = snapshot.mySide.pokemon.filter(p => !p.active && !p.fainted);
    const isTrapped = !!(snapshot.mySide.activePokemon?.volatiles.has('trapped') || snapshot.mySide.activePokemon?.volatiles.has('ingrain'));

    // Run heuristic engine
    const decision = heuristicDecision(snapshot, matchup, strategic, validMoves, switchOptions, this.calc, this.inference, isTrapped);

    if (!decision || decision.type !== 'move') {
      // No confident move heuristic fired — pick best damage move as emergency fallback
      const bestDmgMove = matchup.myAttacking[0];
      if (bestDmgMove !== undefined) {
        const found = enemy.moves.find(m => m && m.id === bestDmgMove.move);
        if (found) return found;
      }
      return enemy.moves.find(m => !!m) ?? null;
    }

    // Map decision back to project Move
    const targetId = decision.moveId;
    if (!targetId) return enemy.moves.find(m => !!m) ?? null;
    return enemy.moves.find(m => m && m.id === targetId)
      ?? enemy.moves.find(m => !!m)
      ?? null;
  }

  shouldSwitch(_enemy: Pokemon, _player: Pokemon, enemyTeam: Pokemon[] | undefined, store?: BattleContext): boolean {
    if (!enemyTeam || enemyTeam.filter(p => p.hp > 0).length <= 1) return false;

    const battle = store?.activeBattle?.value ?? null;
    const config = resolveConfig(battle);

    // Wilds don't switch
    if (config.switchAggressiveness === 0.0) return false;

    let snapshot;
    try {
      snapshot = store ? buildSnapshot(store) : null;
    } catch {
      return false;
    }

    if (!snapshot) return false;

    const activeMoves = snapshot.mySide.activePokemon?.moves.map(id => ({ id, pp: 1, disabled: false })) ?? [];
    const matchup = this.calc.calcMatchup(snapshot, activeMoves);
    const bestOppDmg = matchup.oppAttacking[0]?.maxPercent ?? 0;
    const bestMyDmg = matchup.myAttacking[0]?.maxPercent ?? 0;

    // Scale switch threshold by aggressiveness
    const switchThreshold = 50 - config.switchAggressiveness * 25; // 0.4 → 40, 0.7 → 32.5, 0.9 → 27.5
    return bestOppDmg > switchThreshold && bestMyDmg < 30 && Math.random() < config.switchAggressiveness;
  }

  findBestSwitchIndex(enemyTeam: Pokemon[], _player: Pokemon, currentEnemyUid: string, store?: BattleContext): number {
    let snapshot;
    try {
      snapshot = store ? buildSnapshot(store) : null;
    } catch {
      return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);
    }

    if (!snapshot) return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);

    const oppActive = snapshot.opponentSide.activePokemon;
    if (!oppActive) return this.fallbackSwitchIndex(enemyTeam, currentEnemyUid);

    const candidates = snapshot.mySide.pokemon.filter(p => !p.active && !p.fainted);
    const strategic = evaluateStrategicState(snapshot, this.calc, this.inference);
    const decision = pickBestSwitch(snapshot, candidates, strategic, this.calc, this.inference, oppActive);

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

  /** Preserve evaluateAndUseItem from StandardAI — unchanged */
  async evaluateAndUseItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
    const battleState = ctx.activeBattle.value;
    if (!battleState?.enemyInventory) return false;

    const enemyInventory = battleState.enemyInventory;
    if (!Object.values(enemyInventory).some(qty => qty > 0)) return false;

    const npcName = battleState.isGym
      ? `Líder ${battleState.trainerName || 'de Gimnasio'}`
      : `${battleState.trainerName || 'Entrenador'}`;

    const triggerFXAndSound = async (onlySound = false) => {
      if (!onlySound) {
        if (ctx.animations?.handleHealRequest) {
          await ctx.animations.handleHealRequest({ side: 'enemy' });
        } else {
          const { gameBus } = await import('../../events/gameBus');
          gameBus.emit('PLAY_HEAL', { side: 'enemy' });
        }
      }
      const audioStore = await import('../../../stores/audio').then(m => m.useAudioStore());
      audioStore.play('heal');
    };

    // 1. Revive check
    const fainted = (battleState.enemyTeam ?? []).filter((poke): poke is Pokemon => !!poke && poke.hp <= 0);
    if (fainted.length > 0 && e.hp >= e.maxHp * 0.5) {
      if (enemyInventory['revivemax'] && enemyInventory['revivemax'] > 0) {
        const target = fainted[0]!;
        target.hp = target.maxHp; target.status = undefined;
        if (--enemyInventory['revivemax'] <= 0) delete enemyInventory['revivemax'];
        ctx.addLog(`¡${npcName} usó Revivir Máximo en ${target.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${target.name} revivió por completo!`, 'log-info', target, 'enemy');
        await triggerFXAndSound(true); return true;
      }
      if (enemyInventory['revive'] && enemyInventory['revive'] > 0) {
        const target = fainted[0]!;
        target.hp = Math.floor(target.maxHp * 0.5); target.status = undefined;
        if (--enemyInventory['revive'] <= 0) delete enemyInventory['revive'];
        ctx.addLog(`¡${npcName} usó Revivir en ${target.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${target.name} revivió con la mitad de su salud!`, 'log-info', target, 'enemy');
        await triggerFXAndSound(true); return true;
      }
    }

    // 2. Status check
    if (e.status) {
      type StatusItem = [string, string, string, string];
      const statusItems: StatusItem[] = [
        ['fullrestore', 'Restaurar Todo', 'curó sus problemas de estado', 'healsAll'],
        ['fullheal', 'Cura Total', 'curó sus problemas de estado', 'healsStatus'],
        ['antidote', 'Antídoto', 'fue curado del envenenamiento', 'healsPsn'],
        ['burnheal', 'Cura Quemadura', 'fue curado de la quemadura', 'healsBrn'],
        ['paralyzeheal', 'Antiparaliz', 'fue curado de la parálisis', 'healsPar'],
        ['awakening', 'Despertar', 'se despertó', 'healsSlp'],
        ['iceheal', 'Anticongelante', 'se descongeló', 'healsFrz'],
      ];
      const statusMatch: Record<string, string[]> = {
        fullrestore: ['par','brn','psn','slp','frz','tox'],
        fullheal: ['par','brn','psn','slp','frz','tox'],
        antidote: ['psn','tox'],
        burnheal: ['brn'],
        paralyzeheal: ['par'],
        awakening: ['slp'],
        iceheal: ['frz'],
      };
      for (const [itemId, itemName, curedMsg] of statusItems) {
        const statuses = statusMatch[itemId] ?? [];
        if (!statuses.includes(e.status as string)) continue;
        if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue;
        if (itemId === 'fullrestore') e.hp = e.maxHp;
        e.status = undefined;
        if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId];
        ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} ${curedMsg}!`, 'log-info', e, 'enemy');
        await triggerFXAndSound(); return true;
      }
    }

    // 3. HP check
    if (e.hp < e.maxHp * 0.25) {
      type HealItem = [string, string, number | 'full'];
      const healItems: HealItem[] = [
        ['fullrestore', 'Restaurar Todo', 'full'],
        ['maxpotion', 'Poción Máxima', 'full'],
        ['hyperpotion', 'Hiper Poción', 200],
        ['superpotion', 'Súper Poción', 50],
        ['potion', 'Poción', 20],
      ];
      for (const [itemId, itemName, amount] of healItems) {
        if (!enemyInventory[itemId] || enemyInventory[itemId]! <= 0) continue;
        const prev = e.hp;
        e.hp = amount === 'full' ? e.maxHp : Math.min(e.maxHp, e.hp + amount);
        if (itemId === 'fullrestore') e.status = undefined;
        if (--enemyInventory[itemId]! <= 0) delete enemyInventory[itemId];
        ctx.addLog(`¡${npcName} usó ${itemName} en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
        if (e.hp - prev > 0) { await triggerFXAndSound(); return true; }
      }
    }

    return false;
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private fallbackSwitchIndex(enemyTeam: Pokemon[], currentEnemyUid: string): number {
    const idx = enemyTeam.findIndex(p => p.hp > 0 && p.uid !== currentEnemyUid);
    return idx;
  }
}
