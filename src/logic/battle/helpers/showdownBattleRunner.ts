// src/logic/battle/helpers/showdownBattleRunner.ts
import { requiresAction, classifyRequest } from './requestHelper.ts';
import { isActionConsumed } from './choiceIndexer.ts';

/**
 * Orchestrates choice simulation flow for both in-memory fuzzer replay runs
 * and browser E2E test runs. Standardizes choice retrieval and index advancement.
 */
export class ShowdownBattleRunner {
  playerChoices: string[];
  enemyChoices: string[];
  p1ChoiceIdx: number = 0;
  p2ChoiceIdx: number = 0;

  constructor(playerChoices: string[], enemyChoices: string[]) {
    this.playerChoices = playerChoices || [];
    this.enemyChoices = enemyChoices || [];
  }

  /**
   * Resolves the next choice for the given side from the certified case choices
   * based on the active simulator request. If action is consumed, advances the choice index.
   */
  resolveAndConsumeNextChoice(
    player: 'p1' | 'p2',
    activeRequest: unknown
  ): string {
    const needsAction = requiresAction(activeRequest);
    if (!needsAction) {
      return 'pass';
    }

    const idx = player === 'p1' ? this.p1ChoiceIdx : this.p2ChoiceIdx;
    const list = player === 'p1' ? this.playerChoices : this.enemyChoices;

    // Special case: team preview selection
    if (activeRequest && typeof activeRequest === 'object' && (activeRequest as Record<string, unknown>).teamPreview) {
      return 'team 1';
    }

    let targetIdx = idx;
    const kind = classifyRequest(activeRequest);

    if (kind === 'force-switch') {
      // Buscar la siguiente decisión de tipo 'switch' en la lista a partir del índice actual
      while (targetIdx < list.length && !list[targetIdx]?.trim().toLowerCase().startsWith('switch ')) {
        targetIdx++;
      }
    }

    const rawChoice = list[targetIdx] ?? (kind === 'force-switch' ? 'switch 2' : 'pass');
    const skip = rawChoice.trim().toLowerCase() === 'pass';
    const consumed = isActionConsumed(needsAction, rawChoice, skip);

    if (consumed) {
      if (player === 'p1') {
        this.p1ChoiceIdx = targetIdx + 1;
      } else {
        this.p2ChoiceIdx = targetIdx + 1;
      }
    }

    return rawChoice;
  }
}
