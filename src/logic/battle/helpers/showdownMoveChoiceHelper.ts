/**
 * showdownMoveChoiceHelper.ts
 *
 * Helper centralizado para validar y normalizar elecciones de movimiento
 * en Showdown (recharge, movimientos deshabilitados/sin PP, slots alternativos).
 */

export interface ActiveRequestMove {
  id?: string;
  move?: string;
  disabled?: boolean | string;
  pp?: number;
  maxpp?: number;
}

/**
 * Normaliza y valida una elección de movimiento contra los movimientos activos en el request.
 * Si el movimiento elegido está deshabilitado o sin PP, selecciona el primer movimiento legal disponible.
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
  if (movesList.length === 1 && (movesList[0]?.id === 'recharge' || movesList[0]?.move === 'Recharge')) {
    const suffix = moveMatch[2] ?? '';
    return `move 1${suffix}`;
  }

  const requestedSlot = parseInt(moveMatch[1]!, 10);
  const targetMove = movesList[requestedSlot - 1];
  if (targetMove && (targetMove.disabled || targetMove.pp === 0)) {
    const firstValidIdx = movesList.findIndex(m => m && !m.disabled && (m.pp === undefined || m.pp > 0));
    if (firstValidIdx !== -1) {
      const suffix = moveMatch[2] ?? '';
      return `move ${firstValidIdx + 1}${suffix}`;
    }
  }

  return choiceStr;
}

/**
 * Obtiene el primer movimiento legal de una lista de movimientos activos.
 */
export function getFirstValidMoveSlot(
  activeMoves: ActiveRequestMove[] | undefined,
  fallback = 'move 1'
): string {
  const movesList = Array.isArray(activeMoves) ? activeMoves : [];
  const validIdx = movesList.findIndex(m => m && !m.disabled && (m.pp === undefined || m.pp > 0));
  return validIdx !== -1 ? `move ${validIdx + 1}` : fallback;
}
