// src/logic/battle/helpers/choiceIndexer.ts

/**
 * Determines if a player action is consumed by the Showdown simulator.
 * An action is consumed if the side needed an action, provided a non-empty choice, and was not skipped.
 * 'pass' choices are treated consistently as skips and are not consumed.
 */
export function isActionConsumed(needsAction: boolean, choice: string | undefined, skip: boolean): boolean {
  if (!needsAction) return false;
  if (!choice) return false;
  const clean = choice.trim().toLowerCase();
  if (clean === 'pass' || clean === '') return false;
  if (skip) return false;
  return true;
}

export interface ChoiceIndexerInput {
  p1ChoiceIdx: number;
  p2ChoiceIdx: number;
  p1ActionConsumed: boolean;
  p2ActionConsumed: boolean;
  logs?: string[];
  isSimulation: boolean;
}

/**
 * Common logic to advance choice indices for player 1 (player) and player 2 (enemy).
 * This logic MUST be identical in E2E simulation, frontend game store, and fuzzer replayer.
 */
export function advanceChoiceIndices(input: ChoiceIndexerInput): { p1ChoiceIdx: number; p2ChoiceIdx: number } {

  let p1ChoiceIdx = input.p1ChoiceIdx;
  let p2ChoiceIdx = input.p2ChoiceIdx;

  if (input.p1ActionConsumed) {
    p1ChoiceIdx++;
  }
  if (input.p2ActionConsumed) {
    p2ChoiceIdx++;
  }

  // Process upkeep switches in Showdown logs only for production (non-simulation) modes.
  if (!input.isSimulation) {
    let inUpkeep = false;
    if (input.logs && Array.isArray(input.logs)) {
      for (const line of input.logs) {
        if (line === '|upkeep') {
          inUpkeep = true;
        } else if (inUpkeep) {
          if (line.startsWith('|switch|p1a:') || line.startsWith('|drag|p1a:')) {
            p1ChoiceIdx++;
          } else if (line.startsWith('|switch|p2a:') || line.startsWith('|drag|p2a:')) {
            p2ChoiceIdx++;
          }
        }
      }
    }
  }

  return { p1ChoiceIdx, p2ChoiceIdx };
}

