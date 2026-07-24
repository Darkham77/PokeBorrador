// src/logic/battle/helpers/showdownBattleRunner.ts
import { requiresAction } from './requestHelper.ts';
import { isActionConsumed } from './choiceIndexer.ts';

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
   * Resolves the next choice for the given side from the certified case choices
   * based on the active simulator request. If action is consumed, advances the choice index.
   */
  resolveAndConsumeNextChoice(
    player: 'p1' | 'p2' | 'p3' | 'p4' | string,
    activeRequest: unknown
  ): string {
    const needsAction = requiresAction(activeRequest);
    if (!needsAction) {
      return 'pass';
    }

    const idx = this.indicesBySeat.get(player) || 0;
    const list = this.choicesBySeat.get(player) || [];

    // Special case: team preview selection
    if (activeRequest && typeof activeRequest === 'object' && (activeRequest as Record<string, unknown>).teamPreview) {
      return 'team 1';
    }

    const targetIdx = idx;

    if (targetIdx >= list.length || !list[targetIdx]) {
      return 'pass';
    }

    const rawChoice = list[targetIdx] as string;
    const skip = rawChoice.trim().toLowerCase() === 'pass';
    const consumed = isActionConsumed(needsAction, rawChoice, skip);

    if (consumed) {
      this.indicesBySeat.set(player, targetIdx + 1);
    }

    return rawChoice;
  }
}
