// src/logic/battle/engine/showdownBattleEngine.ts
import { Battle, Side, Pokemon, type SideID } from '@pkmn/sim';
import { createShowdownBattle } from '../helpers/showdownBattleFactory.ts';
import { ChoiceRequest, classifyRequest, requiresAction } from '../helpers/requestHelper.ts';

import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';
import { syncSidePokemon } from '../helpers/showdownSyncHelper.ts';
import { BattleCheatManager, type FuzzerCheat } from '../helpers/battleCheatManager.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../data/system/constants.ts';

export type EngineMode = 'fuzzer' | 'replayer';

export interface BattleCheatRecord {
  turn: number;
  side: SideID;
  type: 'heal';
}

interface RequestPokemonItem {
  ident?: string;
  condition?: string;
  active?: boolean;
  fainted?: boolean;
}

export interface BattleAgent {
  decide(request: ChoiceRequest | null | undefined): string;
}

export interface ShowdownBattleEngineOptions {
  mode: EngineMode;
  format?: string;
  seed?: [number, number, number, number] | string | number[] | null;
  playerChoices?: string[];
  enemyChoices?: string[];
  cheats?: FuzzerCheat[];
  p1Agent?: BattleAgent;
  p2Agent?: BattleAgent;
}

export interface TurnExecutionInput {
  p1Choice?: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  /** A bag medicine consumed P1's action; only P2 may resolve this turn. */
  p1UsedBattleItem?: boolean;
  p1Agent?: BattleAgent;
  p2Agent?: BattleAgent;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  /** When false, IPB healing is disabled (post-testing phase). Defaults to true in fuzzer mode. */
  ipbActive?: boolean;
  /** One-based ordinal or history entry object of the certified atomic history entry being submitted. */
  certifiedHistoryStep?: number | { [key: string]: unknown };
}

export interface TurnExecutionOutput {
  p1AcceptedChoice: string;
  p2AcceptedChoice: string;
  turnLogs: string[];
  battleTurn: number;
  appliedCheats: BattleCheatRecord[];
}


/**
 * Unified Canonical Engine for Battle Simulation.
 * Enforces 100% shared code execution paths for both fuzzer generation and Playwright replay runs.
 */
export class ShowdownBattleEngine {
  public readonly battle: Battle;
  public readonly mode: EngineMode;
  /** Per-seat certified choice index, keyed by side.id (generic for up to 4 seats). */
  public readonly choiceIdx: Map<string, number> = new Map();
  /** Backward-compat accessor. Prefer choiceIdx.get('p1'). */
  get p1ChoiceIdx(): number { return this.choiceIdx.get('p1') ?? 0; }
  /** Backward-compat accessor. Prefer choiceIdx.get('p2'). */
  get p2ChoiceIdx(): number { return this.choiceIdx.get('p2') ?? 0; }

  private readonly seatChoices: Map<string, string[]>;
  private readonly cheatManager: BattleCheatManager;

  constructor(options: ShowdownBattleEngineOptions) {
    this.mode = options.mode;

    this.battle = createShowdownBattle(options.format || ACTIVE_SHOWDOWN_FORMAT, options.seed as string | number[] | null | undefined);
    // p1 = player seat, all others (p2, p3, p4) use the enemyChoices stream.
    this.seatChoices = new Map([ // runtime-map
      ['p1', options.playerChoices ?? []],
      ['p2', options.enemyChoices ?? []],
      ['p3', options.enemyChoices ?? []],
      ['p4', options.enemyChoices ?? []],
    ]);
    // Pre-initialize all seat indices to 0 so choiceIdx.get(seatId) never returns undefined.
    // This makes any ?? 0 fallback in callers structurally dead code (fail-loud guarantee).
    for (const seatId of this.seatChoices.keys()) {
      this.choiceIdx.set(seatId, 0);
    }
    this.cheatManager = new BattleCheatManager(options.cheats);
  }

  public setSeatChoices(seatId: string, choices: string[]): void {
    this.seatChoices.set(seatId, choices || []);
    if (!this.choiceIdx.has(seatId)) {
      this.choiceIdx.set(seatId, 0);
    }
  }

  /**
   * Resolves the choice for a seat based on mode and active request.
   */
  public resolveNextChoice(seatId: string, activeRequest: ChoiceRequest | null | undefined, explicitChoice?: string, agent?: BattleAgent): string {
    const sideObj = this.battle?.sides.find(s => s && s.id === seatId)
      || (seatId === 'p1' ? this.battle?.sides[0] : seatId === 'p2' ? this.battle?.sides[1] : seatId === 'p3' ? this.battle?.sides[2] : seatId === 'p4' ? this.battle?.sides[3] : undefined);
    const simPokemons = sideObj?.pokemon ?? [];
    const activeList = sideObj?.active ?? [];

    const effectiveReq = activeRequest ?? sideObj?.activeRequest;
    const reqKind = classifyRequest(effectiveReq) !== 'none' ? classifyRequest(effectiveReq) : (sideObj?.requestState === 'switch' ? 'force-switch' : sideObj?.requestState === 'move' ? 'move' : 'none');
    const isForceSwitch = reqKind === 'force-switch' || reqKind === 'revive-target' || sideObj?.requestState === 'switch';
    const requestPokemons = Array.isArray(effectiveReq?.side?.pokemon) ? effectiveReq.side.pokemon : [];

    if (!isForceSwitch && !requiresAction(effectiveReq) && sideObj?.requestState !== 'move') return 'pass';

    if (agent) {
      return agent.decide(activeRequest);
    }

    if (activeRequest?.teamPreview) {
      return 'team 1';
    }

    let choiceCandidate = explicitChoice;
    if (choiceCandidate === undefined && this.mode === 'replayer') {
      const choicesList = this.seatChoices.get(seatId) ?? [];
      const currentIdx = this.choiceIdx.get(seatId) ?? 0;
      if (currentIdx < choicesList.length) {
        choiceCandidate = choicesList[currentIdx];
        this.choiceIdx.set(seatId, currentIdx + 1);
      }
    }

    if (isForceSwitch) {
      if (choiceCandidate !== undefined) {
        if (this.mode === 'replayer') {
          return choiceCandidate;
        }
        const trimmed = choiceCandidate.trim().toLowerCase();
        const switchMatch = /^switch\s+(\d+)$/.exec(trimmed);
        if (switchMatch) {
          const targetSlot = parseInt(switchMatch[1]!, 10);
          const targetPoke = simPokemons[targetSlot - 1] ?? (requestPokemons[targetSlot - 1] as RequestPokemonItem | undefined);
          if (targetPoke) {
            const isFnt = 'fainted' in targetPoke && typeof targetPoke.fainted === 'boolean'
              ? targetPoke.fainted
              : ('condition' in targetPoke && typeof targetPoke.condition === 'string' ? targetPoke.condition.includes('fnt') : false);
            const isAct = 'active' in targetPoke && typeof targetPoke.active === 'boolean'
              ? targetPoke.active
              : activeList.includes(targetPoke as Pokemon);
            if (!isFnt && !isAct) {
              return choiceCandidate;
            }
          } else {
            return choiceCandidate;
          }
        }
      }

      const isReviving = reqKind === 'revive-target';
      const targetIdx = simPokemons.length > 0
        ? simPokemons.findIndex(p => p && !activeList.includes(p) && (isReviving ? (p.fainted || p.hp === 0) : (!p.fainted && p.hp > 0)))
        : (requestPokemons as RequestPokemonItem[]).findIndex(p => p && !p.active && (isReviving ? (p.fainted || String(p.condition ?? '').includes('fnt')) : (!p.fainted && !String(p.condition ?? '').includes('fnt'))));

      if (targetIdx !== -1) {
        return `switch ${targetIdx + 1}`;
      }
      const hasAnyLiving = simPokemons.length > 0
        ? simPokemons.some(p => p && !p.fainted && p.hp > 0)
        : (requestPokemons as RequestPokemonItem[]).some(p => p && !p.fainted && !String(p?.condition ?? '').includes('fnt'));
      if (!hasAnyLiving) {
        return 'pass';
      }
      if (choiceCandidate && choiceCandidate.startsWith('switch ')) {
        return choiceCandidate;
      }
      return 'default';
    }

    if (choiceCandidate !== undefined) {
      const trimmed = choiceCandidate.trim().toLowerCase();
      if (trimmed === 'pass') return 'pass';

      const moveMatch = /^move\s+(\d+)$/.exec(trimmed);
      if (moveMatch) {
        const moveIdx = parseInt(moveMatch[1]!, 10) - 1;
        const activeReq = activeRequest?.active?.[0];
        const moves = activeReq?.moves ?? [];
        const targetMove = moves[moveIdx];
        if (targetMove && (targetMove.disabled || (targetMove.pp !== undefined && targetMove.pp <= 0))) {
          const validMoveIdx = moves.findIndex(m => m && !m.disabled && (m.pp === undefined || m.pp > 0));
          if (validMoveIdx !== -1) {
            return `move ${validMoveIdx + 1}`;
          }
          return 'default';
        }
      }

      const switchMatch = /^switch\s+(\d+)$/.exec(trimmed);
      if (switchMatch) {
        const targetSlot = parseInt(switchMatch[1]!, 10);
        const targetPoke = simPokemons[targetSlot - 1];
        if (targetPoke) {
          const isFainted = targetPoke.fainted || targetPoke.hp === 0;
          const isActive = activeList.includes(targetPoke);
          if (isFainted || isActive) {
            const validIdx = simPokemons.findIndex((p) => {
              if (!p || activeList.includes(p)) return false;
              return !p.fainted && p.hp !== 0;
            });
            if (validIdx !== -1) {
              return `switch ${validIdx + 1}`;
            }
            if (classifyRequest(activeRequest) === 'move') {
              return 'move 1';
            }
          }
        }
      }

      return choiceCandidate;
    }

    const choicesList = this.seatChoices.get(seatId) ?? [];
    const currentIdx = this.choiceIdx.get(seatId) ?? 0;

    if (currentIdx >= choicesList.length) {
      throw new Error(`[ShowdownBattleEngine] Required certified choice is missing. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode: this.mode })}`);
    }

    const rawChoice = choicesList[currentIdx] as string;

    if (!rawChoice || rawChoice.trim().length === 0) {
      throw new Error(`[ShowdownBattleEngine] Required certified choice is empty. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode: this.mode })}`);
    }

    this.choiceIdx.set(seatId, currentIdx + 1);
    return rawChoice;
  }

  private executeEnemyOnlyResponse(input: TurnExecutionInput, appliedCheats: BattleCheatRecord[]): TurnExecutionOutput {
    const battle = this.battle;
    if (input.p2Skip) {
      throw new Error('[ShowdownBattleEngine] A bag-medicine response cannot skip both sides without a certified game-action transition.');
    }
    const enemyChoice = this.resolveNextChoice('p2', battle.p2.activeRequest, input.p2Choice, input.p2Agent);
    if (!enemyChoice || enemyChoice === 'pass') {
      throw new Error('[ShowdownBattleEngine] A bag-medicine response requires an explicit enemy choice.');
    }
    if (!requiresAction(battle.p2.activeRequest)) {
      throw new Error('[ShowdownBattleEngine] The enemy has no actionable request for the bag-medicine response.');
    }
    if (!battle.p2.choose(enemyChoice)) {
      throw new Error(`[ShowdownBattleEngine] Enemy choice "${enemyChoice}" was rejected during a bag-medicine response.`);
    }

    const selectedAction = battle.p2.choice.actions[0];
    if (!selectedAction) {
      throw new Error('[ShowdownBattleEngine] The accepted enemy choice produced no executable action.');
    }
    battle.clearRequest();
    battle.p2.clearChoice();
    battle.queue.addChoice(selectedAction);
    const queuedAction = battle.queue.shift();
    if (!queuedAction) {
      throw new Error('[ShowdownBattleEngine] The accepted enemy choice was not queued for execution.');
    }
    battle.runAction(queuedAction);

    if (!battle.ended && !battle.requestState) {
      battle.queue.addChoice({ choice: 'residual' });
      const residualAction = battle.queue.shift();
      if (!residualAction) {
        throw new Error('[ShowdownBattleEngine] The bag-medicine response did not queue residual resolution.');
      }
      battle.runAction(residualAction);
      if (!battle.ended && !battle.requestState) {
        battle.endTurn();
        battle.midTurn = false;
        battle.queue.clear();
        battle.makeRequest('move');
      }
    }

    const logLines = battle.getDebugLog ? battle.getDebugLog() : [];
    return {
      p1AcceptedChoice: '',
      p2AcceptedChoice: enemyChoice,
      turnLogs: Array.isArray(logLines) ? logLines.map(String) : [],
      battleTurn: battle.turn,
      appliedCheats,
    };
  }

  /**
   * Executes a single turn deterministically across all environments.
   */
  public executeTurn(input: TurnExecutionInput = {}): TurnExecutionOutput {
    const battle = this.battle;
    const appliedCheats: BattleCheatRecord[] = [];

    // Pre-turn synchronization (weather, HP, status override from client if provided)
    if (input.weather && input.weather !== 'none') {
      battle.field.setWeather(input.weather, 'debug' as const);
    }
    if (input.p1Hps && typeof input.p1Hps === 'object') {
      syncSidePokemon(battle.p1, input.p1Hps, input.p1Statuses);
    }
    if (input.p2Hps && typeof input.p2Hps === 'object') {
      syncSidePokemon(battle.p2, input.p2Hps, input.p2Statuses);
    }
    if (this.mode === 'replayer') {
      this.cheatManager.applyPreTurnCheats(battle, true, input.certifiedHistoryStep);
    }

    if (input.p1UsedBattleItem) {
      return this.executeEnemyOnlyResponse(input, appliedCheats);
    }

    // 1. Resolve choices for all active seats generically (supports up to 4 seats: p1..p4)
    // Input fields are mapped to a per-seat lookup to avoid hardcoded p1/p2 branching.
    const inputBySeat: Record<string, { explicit?: string; agent?: BattleAgent; skip: boolean }> = {
      p1: { explicit: input.p1Choice, agent: input.p1Agent, skip: !!input.p1Skip },
      p2: { explicit: input.p2Choice, agent: input.p2Agent, skip: !!input.p2Skip },
      p3: { explicit: undefined, agent: input.p2Agent, skip: false },
      p4: { explicit: undefined, agent: input.p2Agent, skip: false },
    };

    const hasAnyForceSwitch = battle.sides.some(s => {
      if (!s) return false;
      const k = classifyRequest(s.activeRequest);
      return k === 'force-switch' || k === 'revive-target' || s.requestState === 'switch';
    });

    type BattleSeat = { id: string; side: Side; choice: string; skip: boolean; mustAct: boolean };
    const seats: BattleSeat[] = battle.sides.filter((side): side is Side => Boolean(side)).map(side => {
      const seatId = side.id;
      const reqKind = classifyRequest(side.activeRequest);
      const isForce = reqKind === 'force-switch' || reqKind === 'revive-target' || side.requestState === 'switch';
      const mustAct = hasAnyForceSwitch ? isForce : (requiresAction(side.activeRequest) || side.requestState === 'move');
      const seatInput = inputBySeat[seatId] ?? { skip: false };
      const choice = mustAct ? this.resolveNextChoice(seatId, side.activeRequest, seatInput.explicit, seatInput.agent) : 'pass';
      return { id: seatId, side, choice, skip: !mustAct || seatInput.skip || choice === 'pass', mustAct };
    });

    // Generic accepted-choice tracker, readable as p1/p2 via TurnExecutionOutput
    const acceptedChoices = new Map<string, string>();

    for (const seat of seats) {
      if (seat.side.isChoiceDone()) continue;
      if (seat.mustAct && seat.skip) {
        // Use Showdown's official autoChoose() via 'default' — handles live and fainted pokemon
        // correctly without bypassing isChoiceDone() state validation.
        // NEVER manipulate side.choice.actions directly: it breaks commitChoices().
        battle.choose(seat.id as SideID, 'default');
        acceptedChoices.set(seat.id, 'default');
        continue;
      }

      if (!seat.mustAct || seat.skip || !seat.choice || seat.choice === 'pass' || seat.side.isChoiceDone()) continue;

      if (seat.side.choice && Array.isArray(seat.side.choice.actions) && seat.side.choice.actions.length > 0) {
        seat.side.clearChoice();
      }

      let ok = false;
      let chooseError: Error | null = null;
      try {
        ok = battle.choose(seat.id as SideID, seat.choice);
      } catch (err) {
        ok = false;
        chooseError = err instanceof Error ? err : new Error(String(err));
      }

      if (ok) {
        acceptedChoices.set(seat.id, seat.choice);
      } else {
        const reqStr = JSON.stringify(seat.side.activeRequest);
        throw new Error(`[ShowdownBattleEngine] Elección "${seat.choice}" rechazada para ${seat.id}. Turn: ${battle.turn}. Req: ${reqStr}. Cause: ${chooseError ? chooseError.message : 'Invalid choice'}`);
      }

      if (battle.ended) break;
    }

    const validSides = battle.sides.filter((s): s is Side => Boolean(s));
    if (!battle.ended && validSides.length > 0 && validSides.every(s => s.isChoiceDone())) {
      battle.commitChoices();
    }

    // 2. Post-Turn IPB Healing
    // If IPB is active for a side and active Pokemon HP drops to critical (<= 30%), restore full HP and PP
    if (this.mode === 'replayer') {
      this.cheatManager.applyPostTurnCheats(battle, input.certifiedHistoryStep);
    } else if (input.ipbActive !== false) {
      for (const side of battle.sides) {
        const sideId = side.id as SideID;
        const activeMon = side.active?.[0];
        if (activeMon && !activeMon.fainted && activeMon.hp <= activeMon.maxhp * 0.3) {
          applyHealCheatToSide(side);
          side.pokemon.forEach((p: Pokemon) => {
            if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`);
          });
          syncRequestConditionsWithSimulator(side);
          appliedCheats.push({ turn: battle.turn, side: sideId, type: 'heal' });
        }
      }
    }


    const logLines = battle.getDebugLog ? battle.getDebugLog() : [];
    const turnLogs = Array.isArray(logLines) ? logLines.map(String) : [];

    return {
      p1AcceptedChoice: acceptedChoices.get('p1') ?? '',
      p2AcceptedChoice: acceptedChoices.get('p2') ?? '',
      turnLogs,
      battleTurn: battle.turn,
      appliedCheats
    };
  }
}
