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



