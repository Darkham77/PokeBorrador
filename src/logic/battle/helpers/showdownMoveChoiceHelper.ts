/**
 * showdownMoveChoiceHelper.ts
 *
 * Centralized helper to validate and normalize move choices
 * in Showdown (recharge, disabled/out of PP moves, alternative slots).
 */

export interface ActiveRequestMove {
  id?: string;
  move?: string;
  disabled?: boolean | string;
  pp?: number;
  maxpp?: number;
}

/**
 * Normalizes and validates a move choice against active moves in the request.
 * If the chosen move is disabled or out of PP, selects the first available legal move.
 */
export function resolveValidMoveChoice(
  choiceStr: string,
  activeMoves: ActiveRequestMove[] | undefined
): string {
  if (!choiceStr) return choiceStr;
  const trimmed = choiceStr.trim().toLowerCase();
  const moveMatch = /^move\s+(\d+)(.*)$/.exec(trimmed);
  if (!moveMatch) return choiceStr;

  const movesList = Array.isArray(activeMoves) ? activeMoves : [];
  if (movesList.length === 0) return choiceStr;

  const suffix = moveMatch[2] ?? '';

  // If there is only 1 move slot available in the request (e.g. locked into 2-turn move like Shadow Force/Solar Beam/Fly,
  // recharge, struggle, or single-move set), Showdown only accepts slot 1.
  if (movesList.length === 1 && movesList[0]?.id) {
    return `move 1${suffix}`;
  }

  const requestedSlot = parseInt(moveMatch[1]!, 10);
  const targetMove = movesList[requestedSlot - 1];

  // If requested move does not exist in request (out of bounds slot) or is disabled or has 0 PP,
  // find the first legal move slot with available PP.
  if (!targetMove || targetMove.disabled || targetMove.pp === 0) {
    const firstValidIdx = movesList.findIndex(
      (m) => m && !m.disabled && (m.pp === undefined || m.pp > 0)
    );
    if (firstValidIdx !== -1) {
      return `move ${firstValidIdx + 1}${suffix}`;
    }
  }

  return choiceStr;
}

/**
 * Retrieves the first legal move from an active moves list.
 */
export function getFirstValidMoveSlot(
  activeMoves: ActiveRequestMove[] | undefined,
  fallback = 'move 1'
): string {
  const movesList = Array.isArray(activeMoves) ? activeMoves : [];
  const validIdx = movesList.findIndex((m) => m && !m.disabled && (m.pp === undefined || m.pp > 0));
  return validIdx !== -1 ? `move ${validIdx + 1}` : fallback;
}
