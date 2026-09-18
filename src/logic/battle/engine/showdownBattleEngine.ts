// src/logic/battle/engine/showdownBattleEngine.ts
import { Battle, Side, Pokemon, type SideID } from '@pkmn/sim';
import { createShowdownBattle } from '../helpers/showdownBattleFactory.ts';
import { ChoiceRequest, classifyRequest, requiresAction } from '../helpers/requestHelper.ts';
import { syncSidePokemon } from '../helpers/showdownSyncHelper.ts';
import { BattleCheatManager } from '../helpers/battleCheatManager.ts';
import type { CertifiedBattleHistoryEntry } from '../../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import { resolveExplicitChoiceHelper, resolveForceSwitchFallback, resolveReplayerCandidate } from './showdownChoiceResolver.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../data/system/constants.ts';
import {
  type BattleSeat,
  type BattleCheatRecord,
  type BattleAgent,
  type TurnExecutionInput,
  buildTurnSeats,
  applyPostTurnHealing,
} from './showdownSeatSyncHelper.ts';

export type EngineMode = 'fuzzer' | 'replayer';

export interface ShowdownBattleEngineOptions {
  mode: EngineMode;
  format?: string;
  seed?: [number, number, number, number] | string | number[] | null;
  playerChoices?: string[];
  enemyChoices?: string[];
  history?: CertifiedBattleHistoryEntry[];
  p1Agent?: BattleAgent;
  p2Agent?: BattleAgent;
}

export interface TurnExecutionOutput {
  p1AcceptedChoice: string;
  p2AcceptedChoice: string;
  turnLogs: string[];
  battleTurn: number;
  appliedCheats: BattleCheatRecord[];
}

function syncPreTurnState(battle: Battle, input: TurnExecutionInput, isReplayMode: boolean, cheatManager: BattleCheatManager): void {
  if (input.weather && input.weather !== 'none') {
    battle.field.setWeather(input.weather, 'debug' as const);
  }
  const isItemTurn = Boolean(input.p1UsedBattleItem || (typeof input.certifiedHistoryStep === 'object' && input.certifiedHistoryStep !== null && Reflect.get(input.certifiedHistoryStep, 'p1UsedBattleItem')));
  if (!isReplayMode || isItemTurn) {
    if (input.p1Hps && typeof input.p1Hps === 'object') {
      syncSidePokemon(battle.p1, input.p1Hps, input.p1Statuses);
    }
    if (input.p2Hps && typeof input.p2Hps === 'object') {
      syncSidePokemon(battle.p2, input.p2Hps, input.p2Statuses);
    }
  }
  if (isReplayMode) {
    cheatManager.applyPreTurnCheats(battle, true, input.certifiedHistoryStep);
  }
}

function applySingleSeatTurnChoice(battle: Battle, seat: BattleSeat, acceptedChoices: Map<string, string>): void {
  if (seat.mustAct && seat.skip) {
    if (seat.side.isChoiceDone()) {
      seat.side.clearChoice();
    }
    battle.choose(seat.id as SideID, 'default');
    acceptedChoices.set(seat.id, 'default');
    return;
  }

  if (!seat.mustAct || seat.skip || !seat.choice || seat.choice === 'pass') return;
  if (!requiresAction(seat.side.activeRequest) || !seat.side.requestState) return;

  if (seat.side.isChoiceDone() || (seat.side.choice && Array.isArray(seat.side.choice.actions) && seat.side.choice.actions.length > 0)) {
    seat.side.clearChoice();
  }

  let ok: boolean;
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
    const sideErr = seat.side.choice?.error;
    throw new Error(`[ShowdownBattleEngine] Elección "${seat.choice}" rechazada para ${seat.id}. Turn: ${battle.turn}. Req: ${reqStr}. Cause: ${chooseError ? chooseError.message : (sideErr || 'Invalid choice')}`);
  }
}

const SEAT_INDEX_MAP: Readonly<Record<string, number>> = { p1: 0, p2: 1, p3: 2, p4: 3 };

function extractSeatSide(battle: Battle | undefined, seatId: string): Side | undefined {
  return battle?.sides.find(s => s && s.id === seatId)
    ?? (SEAT_INDEX_MAP[seatId] !== undefined ? battle?.sides[SEAT_INDEX_MAP[seatId]!] : undefined);
}

function resolveEffectiveRequestKind(effectiveReq: ChoiceRequest | null | undefined, sideObj: Side | undefined): string {
  const baseKind = classifyRequest(effectiveReq);
  if (baseKind !== 'none') return baseKind;
  if (sideObj?.requestState === 'switch') return 'force-switch';
  if (sideObj?.requestState === 'move') return 'move';
  return 'none';
}

function resolveCandidateOrFallback(
  choiceCandidate: string | undefined,
  isForceSwitch: boolean,
  reqKind: string,
  effectiveReq: ChoiceRequest | null | undefined,
  simPokemons: Pokemon[],
  requestPokemons: Array<{ ident?: string; details?: string; active?: boolean; condition?: string }>,
  activeList: (Pokemon | null)[]
): string | undefined {
  if (isForceSwitch) {
    if (choiceCandidate !== undefined) {
      const validatedChoice = resolveExplicitChoiceHelper(choiceCandidate, true, simPokemons, requestPokemons, activeList, effectiveReq);
      if (validatedChoice !== undefined) return validatedChoice;
    }
    return resolveForceSwitchFallback(reqKind, simPokemons, requestPokemons, activeList as Pokemon[]);
  }

  if (choiceCandidate !== undefined) {
    return resolveReplayerCandidate(choiceCandidate, reqKind, effectiveReq, simPokemons, requestPokemons, activeList as Pokemon[]);
  }

  return undefined;
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
  // fallow-ignore-next-line unused-class-member
  get p1ChoiceIdx(): number { return this.choiceIdx.get('p1') ?? 0; }
  /** Backward-compat accessor. Prefer choiceIdx.get('p2'). */
  // fallow-ignore-next-line unused-class-member
  get p2ChoiceIdx(): number { return this.choiceIdx.get('p2') ?? 0; }

  private readonly seatChoices: Map<string, string[]>;
  private readonly cheatManager: BattleCheatManager;

  constructor(options: ShowdownBattleEngineOptions) {
    this.mode = options.mode;

    this.battle = createShowdownBattle(options.format || ACTIVE_SHOWDOWN_FORMAT, options.seed as string | number[] | null | undefined);
    // p1 = player seat, all others (p2, p3, p4) use the enemyChoices stream.
    this.seatChoices = new Map([ // runtime-map: Fast O(1) keyed lookup dictionary
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
    this.cheatManager = new BattleCheatManager(options.history);
  }

  // fallow-ignore-next-line unused-class-member
  public setSeatChoices(seatId: string, choices: string[]): void {
    this.seatChoices.set(seatId, choices || []);
    if (!this.choiceIdx.has(seatId)) {
      this.choiceIdx.set(seatId, 0);
    }
  }

  private advanceSeatReplayerCandidate(seatId: string): string | undefined {
    if (this.mode !== 'replayer') return undefined;
    const choicesList = this.seatChoices.get(seatId) ?? [];
    const currentIdx = this.choiceIdx.get(seatId) ?? 0;
    if (currentIdx < choicesList.length) {
      const candidate = choicesList[currentIdx];
      this.choiceIdx.set(seatId, currentIdx + 1);
      return candidate;
    }
    return undefined;
  }

  private consumeCertifiedChoice(seatId: string, activeRequest: ChoiceRequest | null | undefined): string {
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

  /**
   * Resolves the choice for a seat based on mode and active request.
   */
  public resolveNextChoice(seatId: string, activeRequest: ChoiceRequest | null | undefined, explicitChoice?: string, agent?: BattleAgent): string {
    const sideObj = extractSeatSide(this.battle, seatId);
    const simPokemons = sideObj?.pokemon ?? [];
    const activeList = sideObj?.active ?? [];

    const effectiveReq = activeRequest ?? sideObj?.activeRequest;
    const reqKind = resolveEffectiveRequestKind(effectiveReq, sideObj);
    const isForceSwitch = reqKind === 'force-switch' || reqKind === 'revive-target' || sideObj?.requestState === 'switch';
    const requestPokemons = Array.isArray(effectiveReq?.side?.pokemon) ? effectiveReq.side.pokemon : [];

    if (!isForceSwitch && !requiresAction(effectiveReq) && sideObj?.requestState !== 'move') return 'pass';
    if (agent) return agent.decide(activeRequest);
    if (activeRequest?.teamPreview) return 'team 1';

    if (explicitChoice !== undefined) {
      const explicitRes = resolveExplicitChoiceHelper(explicitChoice, isForceSwitch, simPokemons, requestPokemons, activeList, effectiveReq);
      if (explicitRes !== undefined) return explicitRes;
    }

    const choiceCandidate = this.advanceSeatReplayerCandidate(seatId);
    const candidateRes = resolveCandidateOrFallback(choiceCandidate, isForceSwitch, reqKind, effectiveReq, simPokemons, requestPokemons, activeList);
    if (candidateRes !== undefined) {
      return candidateRes;
    }

    return this.consumeCertifiedChoice(seatId, activeRequest);
  }

  private executeEnemyOnlyResponse(input: TurnExecutionInput, appliedCheats: BattleCheatRecord[]): TurnExecutionOutput {
    const battle = this.battle;
    const startLogIdx = Array.isArray(battle.log) ? battle.log.length : 0;
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

    const turnLogs = Array.isArray(battle.log) ? battle.log.slice(startLogIdx) : [];
    return {
      p1AcceptedChoice: '',
      p2AcceptedChoice: enemyChoice,
      turnLogs,
      battleTurn: battle.turn,
      appliedCheats,
    };
  }

  /**
   * Executes a single turn deterministically across all environments.
   */
  public executeTurn(input: TurnExecutionInput = {}): TurnExecutionOutput {
    const battle = this.battle;
    const startLogIdx = Array.isArray(battle.log) ? battle.log.length : 0;
    const appliedCheats: BattleCheatRecord[] = [];

    syncPreTurnState(battle, input, this.mode === 'replayer', this.cheatManager);

    if (input.p1UsedBattleItem) {
      return this.executeEnemyOnlyResponse(input, appliedCheats);
    }

    const seats = buildTurnSeats(battle, input, (seatId, req, explicit, agent) =>
      this.resolveNextChoice(seatId, req as ChoiceRequest, explicit, agent)
    );

    const acceptedChoices = new Map<string, string>();
    const startTurn = battle.turn;
    const startReqState = battle.requestState;

    for (const seat of seats) {
      if (battle.ended) break;
      if (battle.turn !== startTurn || battle.requestState !== startReqState) break;
      applySingleSeatTurnChoice(battle, seat, acceptedChoices);
      if (battle.ended) break;
    }

    if (!battle.ended && battle.allChoicesDone()) {
      battle.commitChoices();
    }

    applyPostTurnHealing(battle, this.mode === 'replayer', this.cheatManager, input, appliedCheats);


    const turnLogs = Array.isArray(battle.log) ? battle.log.slice(startLogIdx) : [];

    return {
      p1AcceptedChoice: acceptedChoices.get('p1') ?? '',
      p2AcceptedChoice: acceptedChoices.get('p2') ?? '',
      turnLogs,
      battleTurn: battle.turn,
      appliedCheats
    };
  }
}
