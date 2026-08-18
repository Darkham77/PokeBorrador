/**
 * src/components/battle/moveTooltipStatusHelper.ts
 *
 * Pure presentation formatting helpers for MoveTooltipStatus.
 */

export function getTargetCssClass(isSelf?: boolean): 'boosted' | 'penalized' {
  return isSelf ? 'boosted' : 'penalized';
}

export function getDirectionCssClass(direction?: 'up' | 'down'): 'boosted' | 'penalized' {
  return direction === 'up' ? 'boosted' : 'penalized';
}

export function getTargetArrow(isSelf?: boolean): '▲' | '▼' {
  return isSelf ? '▲' : '▼';
}

export function getDirectionArrow(direction?: 'up' | 'down'): '▲' | '▼' {
  return direction === 'up' ? '▲' : '▼';
}

export function formatStageValue(stage?: number): string {
  const val = stage ?? 0;
  return `${val >= 0 ? '+' : ''}${val}`;
}

export function getStageRangeLabel(currentStage?: number, finalStage?: number): string {
  return `${formatStageValue(currentStage)} ➔ ${formatStageValue(finalStage)}`;
}
