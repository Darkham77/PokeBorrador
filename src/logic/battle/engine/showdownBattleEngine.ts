// src/logic/battle/engine/showdownBattleEngine.ts
import type { Battle } from '@pkmn/sim';
import { createShowdownBattle } from '../helpers/showdownBattleFactory.ts';
import { type ChoiceRequest, requiresAction } from '../helpers/requestHelper.ts';
import { BattleCheatManager } from '../helpers/battleCheatManager.ts';
import type { CertifiedBattleHistoryEntry } from '../../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import {
  resolveExplicitChoiceHelper,
  resolveCandidateOrFallback,
  extractSeatSide,
  resolveEffectiveRequestKind,
  advanceSeatReplayerCandidate,
  consumeCertifiedChoice
} from './showdownChoiceResolver.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../data/system/constants.ts';
import {
  type BattleCheatRecord,
  type BattleAgent,
  type TurnExecutionInput,
  buildTurnSeats,
  applyPostTurnHealing,
} from './showdownSeatSyncHelper.ts';
import {
  syncPreTurnState,
  executeEnemyOnlyResponse,
  runTurnSeatChoices
} from './showdownTurnExecutionHelper.ts';

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

    const choiceCandidate = advanceSeatReplayerCandidate(this.mode, this.seatChoices, this.choiceIdx, seatId);
    const candidateRes = resolveCandidateOrFallback(choiceCandidate, isForceSwitch, reqKind, effectiveReq, simPokemons, requestPokemons, activeList);
    if (candidateRes !== undefined) {
      return candidateRes;
    }

    return consumeCertifiedChoice(this.mode, this.seatChoices, this.choiceIdx, seatId, activeRequest);
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
      return executeEnemyOnlyResponse(battle, input, appliedCheats, (s, r, e, a) =>
        this.resolveNextChoice(s, r, e, a as BattleAgent | undefined)
      );
    }

    const seats = buildTurnSeats(battle, input, (seatId, req, explicit, agent) =>
      this.resolveNextChoice(seatId, req as ChoiceRequest, explicit, agent)
    );

    const acceptedChoices = new Map<string, string>();
    runTurnSeatChoices(battle, seats, acceptedChoices);

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
