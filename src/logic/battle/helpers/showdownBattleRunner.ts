import type { SideID } from '@pkmn/sim';
import { ChoiceRequest, requiresAction } from './requestHelper.ts';
import { ShowdownBattleEngine } from '../engine/showdownBattleEngine.ts';
import { isCertifiedBattleGameAction, type CertifiedBattleGameAction } from '../../../types/battle/certifiedBattleActions.ts';

export const REPLAY_SEATS: readonly SideID[] = ['p1', 'p2', 'p3', 'p4']; // domain-ok

export interface CertifiedReplayHistoryEntry {
  p1Choice: string;
  p2Choice: string;
  battleTurn?: number;
  turnCount?: number;
  p1GameAction?: CertifiedBattleGameAction;
  p1Heal?: boolean;
  p2Heal?: boolean;
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
}

/**
 * Orchestrates choice simulation flow for both in-memory fuzzer replay runs
 * and browser E2E test runs. Standardizes choice retrieval and index advancement.
 */
export class ShowdownBattleRunner {
  choicesBySeat: Map<string, string[]> = new Map();
  indicesBySeat: Map<string, number> = new Map();

  constructor(playerChoices: string[], enemyChoices: string[]) {
    this.choicesBySeat.set('p1', playerChoices || []);
    this.choicesBySeat.set('p2', enemyChoices || []);
    this.indicesBySeat.set('p1', 0);
    this.indicesBySeat.set('p2', 0);
  }

  /**
   * The certified history is the atomic replay source: one entry represents
   * one Showdown submission, including P2-only forced replacements.
   */
  static requireHistoryChoice(debug: object, seat: SideID): string {
    if (seat !== 'p1' && seat !== 'p2') {
      throw new Error(`[ShowdownBattleRunner] Seat is not available in the current singles simulator request. context=${JSON.stringify({ seat })}`);
    }
    const history = Reflect.get(debug, 'history') as CertifiedReplayHistoryEntry[];
    const historyIndex = Reflect.get(debug, 'replayHistoryIdx') as number | undefined;
    if (!Array.isArray(history) || typeof historyIndex !== 'number') {
      throw new Error(`[ShowdownBattleRunner] Certified replay history or cursor is missing. context=${JSON.stringify({ seat, historyIndex, hasHistory: Array.isArray(history) })}`);
    }
    if (historyIndex >= history.length || Reflect.get(debug, 'certifiedReplayWorkerEnded') === true) {
      return '';
    }
    return this.requireHistoryEntry(history, historyIndex)[`${seat}Choice`];
  }

  /**
   * Returns the next atomic submission only while Showdown still awaits one.
   * A terminal response must consume the whole certified history and cannot
   * manufacture a replacement action after the battle is already over.
   */
  static requirePendingHistoryEntry(debug: object): CertifiedReplayHistoryEntry | null {
    const history = Reflect.get(debug, 'history') as CertifiedReplayHistoryEntry[];
    const historyIndex = Reflect.get(debug, 'replayHistoryIdx') as number | undefined;
    if (!Array.isArray(history) || typeof historyIndex !== 'number') {
      throw new Error(`[ShowdownBattleRunner] Certified replay history or cursor is missing. context=${JSON.stringify({ historyIndex, hasHistory: Array.isArray(history) })}`);
    }

    const workerEnded = Reflect.get(debug, 'certifiedReplayWorkerEnded') === true;
    if (workerEnded) {
      return null;
    }

    return this.requireHistoryEntry(history, historyIndex);
  }

  static requireHistoryEntry(history: unknown[], historyIndex: number): CertifiedReplayHistoryEntry {
    const step = history[historyIndex];
    if (!step || typeof step !== 'object') {
      throw new Error(`[ShowdownBattleRunner] Certified replay history step is missing. context=${JSON.stringify({ historyIndex, historyLength: history.length })}`);
    }
    const p1Choice = Reflect.get(step, 'p1Choice') as string | undefined;
    const p2Choice = Reflect.get(step, 'p2Choice') as string | undefined;
    const battleTurn = Reflect.get(step, 'battleTurn') as number | undefined;
    const p1GameAction: unknown = Reflect.get(step, 'p1GameAction');
    if (typeof p1Choice !== 'string' || typeof p2Choice !== 'string' || (battleTurn !== undefined && typeof battleTurn !== 'number') || (p1GameAction !== undefined && (!isCertifiedBattleGameAction(p1GameAction) || p1Choice !== '' || p2Choice === ''))) {
      throw new Error(`[ShowdownBattleRunner] Certified replay history entry is invalid. context=${JSON.stringify({ historyIndex, p1Choice, p2Choice, battleTurn, p1GameAction })}`);
    }
    return p1GameAction === undefined
      ? { p1Choice, p2Choice, battleTurn }
      : { p1Choice, p2Choice, battleTurn, p1GameAction: p1GameAction as CertifiedBattleGameAction };
  }

  static advanceHistoryAfterAcceptedTurn(debug: object): void {
    const historyIndex = Reflect.get(debug, 'replayHistoryIdx') as number | undefined;
    if (typeof historyIndex !== 'number') {
      throw new Error('[ShowdownBattleRunner] Certified replay cursor is missing after an accepted Showdown turn.');
    }
    const history: unknown = Reflect.get(debug, 'history');
    if (!Array.isArray(history)) {
      throw new Error('[ShowdownBattleRunner] Certified replay history is missing after an accepted Showdown turn.');
    }
    if (historyIndex >= history.length) {
      Reflect.set(debug, 'certifiedReplayWorkerEnded', true);
      return;
    }
    const nextHistoryIndex = historyIndex + 1;
    const consumedHistory = history.slice(0, nextHistoryIndex).map((_, index) => this.requireHistoryEntry(history, index));
    Reflect.set(debug, 'replayHistoryIdx', nextHistoryIndex);
    Reflect.set(debug, 'p1ChoiceIdx', consumedHistory.filter(({ p1Choice }) => p1Choice !== '').length);
    Reflect.set(debug, 'p2ChoiceIdx', consumedHistory.filter(({ p2Choice }) => p2Choice !== '').length);
  }

  get p1ChoiceIdx(): number {
    return this.indicesBySeat.get('p1') || 0;
  }

  set p1ChoiceIdx(val: number) {
    this.indicesBySeat.set('p1', val);
  }

  get p2ChoiceIdx(): number {
    return this.indicesBySeat.get('p2') || 0;
  }

  set p2ChoiceIdx(val: number) {
    this.indicesBySeat.set('p2', val);
  }

  setSeatChoices(seatId: string, choices: string[]): void {
    this.choicesBySeat.set(seatId, choices || []);
    if (!this.indicesBySeat.has(seatId)) {
      this.indicesBySeat.set(seatId, 0);
    }
  }

  /**
   * Reads a certified choice for visual preparation without advancing its
   * stream. Only the code path that submits the choice to Showdown may consume
   * it; previews must never alter replay state.
   */
  peekNextChoice(player: SideID, activeRequest: unknown): string {
    if (!requiresAction(activeRequest)) return 'pass';
    if (!REPLAY_SEATS.includes(player)) {
      throw new Error(`[ShowdownBattleRunner] Seat is not available in the current simulator request. context=${JSON.stringify({ seat: player, activeRequest })}`);
    }
    const index = this.indicesBySeat.get(player) ?? 0;
    const choices = this.choicesBySeat.get(player) ?? [];
    const choice = choices[index];
    if (!choice || choice.trim().length === 0) {
      throw new Error(`[ShowdownBattleRunner] Required certified preview choice is missing. context=${JSON.stringify({ seat: player, choiceIndex: index, choiceCount: choices.length, activeRequest })}`);
    }
    return choice;
  }

  /**
   * Resolves the next choice for the given side from the certified case choices
   * based on the active simulator request. If action is consumed, advances the choice index.
   */
  resolveAndConsumeNextChoice(
    player: SideID,
    activeRequest: ChoiceRequest | null | undefined,
    readiness?: {
      subState?: string;
      isProcessing?: boolean;
      activePokeHp?: number;
      hasPendingSwitch?: boolean;
    }
  ): string {
    const needsAction = requiresAction(activeRequest);
    if (!needsAction) {
      return 'pass';
    }

    // Verify UI FSM readiness inside runner if context provided
    if (readiness) {
      const { subState, isProcessing, activePokeHp, hasPendingSwitch } = readiness;
      const replayContext = JSON.stringify({
        seat: player,
        subState,
        isProcessing,
        activePokeHp,
        hasPendingSwitch,
        p1ChoiceIdx: this.p1ChoiceIdx,
        p1ChoiceCount: this.choicesBySeat.get('p1')?.length,
        p2ChoiceIdx: this.p2ChoiceIdx,
        p2ChoiceCount: this.choicesBySeat.get('p2')?.length,
        activeRequest
      });
      if (isProcessing) throw new Error(`[ShowdownBattleRunner] Required certified choice cannot execute while the battle is processing. context=${replayContext}`);
      if (subState && subState !== 'WAIT_INPUT' && subState !== 'SWITCH_MENU' && subState !== 'PLAYER_FAINT_SEQ') {
        throw new Error(`[ShowdownBattleRunner] Required certified choice cannot execute from its FSM substate. context=${replayContext}`);
      }
      if (hasPendingSwitch || (activePokeHp !== undefined && activePokeHp <= 0)) {
        if (subState !== 'SWITCH_MENU' && subState !== 'PLAYER_FAINT_SEQ') {
          throw new Error(`[ShowdownBattleRunner] Required certified switch choice arrived before the switch FSM state. context=${replayContext}`);
        }
      }
    }

    const engine = new ShowdownBattleEngine({
      mode: 'replayer',
      playerChoices: this.choicesBySeat.get('p1'),
      enemyChoices: this.choicesBySeat.get('p2')
    });
    for (const [seatId, choices] of this.choicesBySeat.entries()) {
      engine.setSeatChoices(seatId, choices);
    }
    // Sync all seat indices from the runner's tracked state into the transient engine
    for (const [seatId, idx] of Array.from(this.choicesBySeat.keys(), id => [id, this.indicesBySeat.get(id) ?? 0] as const)) {
      engine.choiceIdx.set(seatId, idx);
    }

    if (!REPLAY_SEATS.includes(player)) {
      throw new Error(`[ShowdownBattleRunner] Seat is not available in the current simulator request. context=${JSON.stringify({ seat: player, activeRequest })}`);
    }
    const seatId = player;
    const choice = engine.resolveNextChoice(seatId, activeRequest);

    // Sync back all updated seat indices from the transient engine to the runner
    for (const [sid, idx] of engine.choiceIdx.entries()) {
      this.indicesBySeat.set(sid, idx);
    }

    return choice;
  }
}
