// src/logic/battle/engine/showdownBattleEngine.ts
import { Battle, Side, Pokemon, type SideID } from '@pkmn/sim';
import { createShowdownBattle } from '../helpers/showdownBattleFactory.ts';
import { ChoiceRequest, classifyRequest, requiresAction } from '../helpers/requestHelper.ts';

import { isActionConsumed } from '../helpers/choiceIndexer.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';
import { syncSidePokemon } from '../helpers/showdownSyncHelper.ts';
import { BattleCheatManager, type FuzzerCheat } from '../helpers/battleCheatManager.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../data/system/constants.ts';

export type EngineMode = 'fuzzer' | 'replayer';

export interface BattleCheatRecord {
  turn: number;
  side: 'p1' | 'p2';
  type: 'heal';
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
  p1Agent?: BattleAgent;
  p2Agent?: BattleAgent;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  /** When false, IPB healing is disabled (post-testing phase). Defaults to true in fuzzer mode. */
  ipbActive?: boolean;
  /** One-based ordinal of the certified atomic history entry being submitted. */
  certifiedHistoryStep?: number;
}

export interface TurnExecutionOutput {
  p1AcceptedChoice: string;
  p2AcceptedChoice: string;
  turnLogs: string[];
  battleTurn: number;
  appliedCheats: BattleCheatRecord[];
}

/**
 * Single Source of Truth for PRNG & LCG Deterministic Initialization.
 * Synchronizes Showdown's battle.prng with Math.random LCG using the batch seed.
 */
function initDeterministicRNG(seedInput?: [number, number, number, number] | string | number[] | null): number {
  let numericSeed = 12345;
  if (Array.isArray(seedInput) && seedInput.length > 0) {
    numericSeed = seedInput.reduce((acc, curr) => (acc + Number(curr)) % 2147483647, 0) || 12345;
  } else if (typeof seedInput === 'string') {
    const parsed = seedInput.split(',').map(Number).filter(n => !isNaN(n));
    if (parsed.length > 0) {
      numericSeed = parsed.reduce((acc, curr) => (acc + curr) % 2147483647, 0) || 12345;
    }
  }

  let currentRngState = numericSeed;
  Math.random = () => {
    const x = Math.sin(currentRngState++) * 10000;
    return x - Math.floor(x);
  };

  return numericSeed;
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
    initDeterministicRNG(options.seed);

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
    const needsAction = requiresAction(activeRequest);
    if (!needsAction) return 'pass';

    if (explicitChoice !== undefined) {
      if (explicitChoice.trim().toLowerCase() === 'pass') return 'pass';
      return explicitChoice;
    }

    if (agent) {
      return agent.decide(activeRequest);
    }

    if (activeRequest?.teamPreview) {
      return 'team 1';
    }

    const choicesList = this.seatChoices.get(seatId) ?? [];
    const currentIdx = this.choiceIdx.get(seatId) ?? 0;

    if (currentIdx >= choicesList.length) {
      throw new Error(`[ShowdownBattleEngine] Required certified choice is missing. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode: this.mode })}`);
    }

    const rawChoice = choicesList[currentIdx] as string;

    if (!rawChoice) {
      throw new Error(`[ShowdownBattleEngine] Required certified choice is empty. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode: this.mode })}`);
    }

    const skip = rawChoice.trim().toLowerCase() === 'pass';
    const consumed = isActionConsumed(needsAction, rawChoice, skip);

    if (consumed) {
      this.choiceIdx.set(seatId, currentIdx + 1);
    }

    return rawChoice;
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

    // 1. Resolve choices for all active seats generically (supports up to 4 seats: p1..p4)
    // Input fields are mapped to a per-seat lookup to avoid hardcoded p1/p2 branching.
    const inputBySeat: Record<string, { explicit?: string; agent?: BattleAgent; skip: boolean }> = {
      p1: { explicit: input.p1Choice, agent: input.p1Agent, skip: !!input.p1Skip },
      p2: { explicit: input.p2Choice, agent: input.p2Agent, skip: !!input.p2Skip },
      p3: { explicit: undefined, agent: input.p2Agent, skip: false },
      p4: { explicit: undefined, agent: input.p2Agent, skip: false },
    };

    type BattleSeat = { id: string; side: Side; choice: string; skip: boolean; mustAct: boolean };
    const seats: BattleSeat[] = battle.sides.map(side => {
      const seatId = side.id;
      const mustAct = requiresAction(side.activeRequest);
      const seatInput = inputBySeat[seatId] ?? { skip: false };
      const choice = this.resolveNextChoice(seatId, side.activeRequest, seatInput.explicit, seatInput.agent);
      return { id: seatId, side, choice, skip: seatInput.skip || choice === 'pass', mustAct };
    });

    // Generic accepted-choice tracker, readable as p1/p2 via TurnExecutionOutput
    const acceptedChoices = new Map<string, string>();

    for (const seat of seats) {
      if (seat.mustAct && seat.skip) {
        // Use Showdown's official autoChoose() via 'default' — handles live and fainted pokemon
        // correctly without bypassing isChoiceDone() state validation.
        // NEVER manipulate side.choice.actions directly: it breaks commitChoices().
        battle.choose(seat.id as SideID, 'default');
        acceptedChoices.set(seat.id, 'default');
        continue;
      }

      if (!seat.mustAct || seat.skip || !seat.choice || seat.choice === 'pass') continue;

      let ok = false;
      let chooseError: Error | null = null;
      try {
        ok = battle.choose(seat.id as SideID, seat.choice);
      } catch (err) {
        ok = false;
        chooseError = err instanceof Error ? err : new Error(String(err));
      }
      if (!ok) {
        const reqStr = JSON.stringify(seat.side.activeRequest);
        throw new Error(`[ShowdownBattleEngine] Elección "${seat.choice}" rechazada para ${seat.id}. Turn: ${battle.turn}. Req: ${reqStr}. Cause: ${chooseError ? chooseError.message : 'Unknown error'}`);
      }

      acceptedChoices.set(seat.id, seat.choice);
      if (battle.ended) break;
    }

    if (!battle.ended && battle.allChoicesDone()) {
      battle.commitChoices();
    }

    // 2. Post-Turn IPB Healing
    // If IPB is active for a side and active Pokemon HP drops to critical (<= 30%), restore full HP and PP
    const isForceSwitchPending = battle.sides.some(s => classifyRequest(s.activeRequest) === 'force-switch');
    if (this.mode === 'replayer') {
      this.cheatManager.applyPostTurnCheats(battle, input.certifiedHistoryStep);
    } else if (!isForceSwitchPending && input.ipbActive !== false) {
      for (const side of battle.sides) {
        const sideId = side.id as 'p1' | 'p2';
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
