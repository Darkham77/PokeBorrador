// src/logic/battle/engine/showdownBattleEngine.ts
import { Battle, Side, Pokemon } from '@pkmn/sim';
import { createShowdownBattle } from '../helpers/showdownBattleFactory.ts';
import { classifyRequest, requiresAction } from '../helpers/requestHelper.ts';
import { isActionConsumed } from '../helpers/choiceIndexer.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';

export type EngineMode = 'fuzzer' | 'replayer';

export interface BattleCheatRecord {
  turn: number;
  side: 'p1' | 'p2';
  type: 'heal';
}

export interface ShowdownBattleEngineOptions {
  mode: EngineMode;
  format?: string;
  seed?: [number, number, number, number] | string | number[] | null;
  playerChoices?: string[];
  enemyChoices?: string[];
  cheats?: BattleCheatRecord[];
}

export interface TurnExecutionInput {
  p1Choice?: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  /** When false, IPB healing is disabled (post-testing phase). Defaults to true in fuzzer mode. */
  ipbActive?: boolean;
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
export function initDeterministicRNG(seedInput?: [number, number, number, number] | string | number[] | null): number {
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
  public p1ChoiceIdx = 0;
  public p2ChoiceIdx = 0;

  private readonly playerChoices: string[];
  private readonly enemyChoices: string[];
  private readonly cheatsMap = new Map<number, { p1?: boolean; p2?: boolean }>();

  constructor(options: ShowdownBattleEngineOptions) {
    this.mode = options.mode;
    initDeterministicRNG(options.seed);

    this.battle = createShowdownBattle(options.format || 'gen5customgame', options.seed as string | number[] | null | undefined);
    this.playerChoices = options.playerChoices || [];
    this.enemyChoices = options.enemyChoices || [];

    if (Array.isArray(options.cheats)) {
      for (const c of options.cheats) {
        const entry = this.cheatsMap.get(c.turn) || {};
        if (c.side === 'p1') entry.p1 = true;
        if (c.side === 'p2') entry.p2 = true;
        this.cheatsMap.set(c.turn, entry);
      }
    }
  }

  /**
   * Resolves the choice for a seat based on mode and active request.
   */
  public resolveNextChoice(seatId: 'p1' | 'p2', activeRequest: unknown, explicitChoice?: string): string {
    const needsAction = requiresAction(activeRequest);
    if (!needsAction) return 'pass';

    if (this.mode === 'fuzzer' && explicitChoice) {
      return explicitChoice;
    }

    const choicesList = seatId === 'p1' ? this.playerChoices : this.enemyChoices;
    const currentIdx = seatId === 'p1' ? this.p1ChoiceIdx : this.p2ChoiceIdx;

    if (activeRequest && typeof activeRequest === 'object' && (activeRequest as Record<string, unknown>).teamPreview) {
      return 'team 1';
    }

    if (currentIdx >= choicesList.length || !choicesList[currentIdx]) {
      return 'pass';
    }

    const rawChoice = choicesList[currentIdx] as string;
    const skip = rawChoice.trim().toLowerCase() === 'pass';
    const consumed = isActionConsumed(needsAction, rawChoice, skip);

    if (consumed) {
      if (seatId === 'p1') this.p1ChoiceIdx++;
      else this.p2ChoiceIdx++;
    }

    return rawChoice;
  }

  /**
   * Executes a single turn deterministically across all environments.
   */
  public executeTurn(input: TurnExecutionInput = {}): TurnExecutionOutput {
    const battle = this.battle;
    const appliedCheats: BattleCheatRecord[] = [];

    // 1. Resolve choices for required seats
    const seats: Array<{ id: 'p1' | 'p2'; side: Side; choice: string; skip: boolean; mustAct: boolean }> = battle.sides.map(side => {
      const seatId = side.id as 'p1' | 'p2';
      const kindBefore = classifyRequest(side.activeRequest);
      const hasOtherForceSwitch = battle.sides.some(s => s.id !== seatId && classifyRequest(s.activeRequest) === 'force-switch');
      const mustAct = kindBefore !== 'none' && kindBefore !== 'wait' && (!hasOtherForceSwitch || kindBefore === 'force-switch');
      
      const explicit = seatId === 'p1' ? input.p1Choice : input.p2Choice;
      const skip = seatId === 'p1' ? !!input.p1Skip : !!input.p2Skip;
      const choice = this.resolveNextChoice(seatId, side.activeRequest, explicit);

      return { id: seatId, side, choice, skip: skip || choice === 'pass', mustAct };
    });

    let p1AcceptedChoice = '';
    let p2AcceptedChoice = '';

    for (const seat of seats) {
      if (battle.ended) break;
      if (!seat.mustAct || seat.skip || !seat.choice || seat.choice === 'pass') continue;

      let ok = false;
      try {
        ok = battle.choose(seat.id, seat.choice);
      } catch {
        ok = false;
      }
      if (!ok && seat.choice.startsWith('switch')) {
        for (let mIdx = 1; mIdx <= 4; mIdx++) {
          try {
            if (battle.choose(seat.id, `move ${mIdx}`)) {
              seat.choice = `move ${mIdx}`;
              ok = true;
              break;
            }
          } catch {
            // try next move slot
          }
        }
      }
      if (!ok) {
        throw new Error(`[ShowdownBattleEngine] Elección "${seat.choice}" rechazada para ${seat.id}. Turn: ${battle.turn}`);
      }

      if (seat.id === 'p1') p1AcceptedChoice = seat.choice;
      else if (seat.id === 'p2') p2AcceptedChoice = seat.choice;
    }

    if (!p1AcceptedChoice && !p2AcceptedChoice && !battle.ended) {
      const b = battle as unknown as { allChoicesDone?: () => boolean; commitChoices?: () => void };
      if (typeof b.allChoicesDone === 'function' && b.allChoicesDone() && typeof b.commitChoices === 'function') {
        b.commitChoices();
      }
    }

    // 2. Post-Turn IPB Healing & Cheats Evaluation
    // In fuzzer mode: BOTH sides are healed while ipbActive=true so the battle stays alive
    // long enough to test all objectives. Once ipbActive=false, cheats stop and the battle
    // resolves naturally. This is the Infinite Punching Bag pattern.
    // Canonical reference: game-simulation SKILL.md#infinite-punching-bag-pattern
    const turnKey = battle.turn;
    const replayCheatEntry = this.cheatsMap.get(turnKey);

    const p1Active = battle.p1?.active?.[0];
    const p2Active = battle.p2?.active?.[0];

    const isForceSwitchPending = battle.sides.some(s => classifyRequest(s.activeRequest) === 'force-switch');
    const p1NeedsInFuzzer = !isForceSwitchPending && this.mode === 'fuzzer' && (input.ipbActive !== false) && p1Active && !p1Active.fainted && p1Active.hp <= p1Active.maxhp * 0.3;
    const p2NeedsInFuzzer = !isForceSwitchPending && this.mode === 'fuzzer' && (input.ipbActive !== false) && p2Active && !p2Active.fainted && p2Active.hp <= p2Active.maxhp * 0.3;

    for (const sideId of ['p1', 'p2'] as const) {
      const side = battle[sideId];
      if (!side) continue;
      const needsFuzzer = sideId === 'p1' ? p1NeedsInFuzzer : p2NeedsInFuzzer;
      const needsReplayer = this.mode === 'replayer' && replayCheatEntry && replayCheatEntry[sideId];
      if (!needsFuzzer && !needsReplayer) continue;
      applyHealCheatToSide(side);
      side.pokemon.forEach((p: Pokemon) => {
        if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`);
      });
      syncRequestConditionsWithSimulator(side as unknown as Parameters<typeof syncRequestConditionsWithSimulator>[0]);
      appliedCheats.push({ turn: turnKey, side: sideId, type: 'heal' });
    }


    const logLines = battle.getDebugLog ? battle.getDebugLog() : [];
    const turnLogs = Array.isArray(logLines) ? logLines.map(String) : [];

    return {
      p1AcceptedChoice,
      p2AcceptedChoice,
      turnLogs,
      battleTurn: battle.turn,
      appliedCheats
    };
  }
}
