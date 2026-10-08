/**
 * src/components/battle/moveTooltipStatusHelper.ts
 *
 * Pure presentation formatting helpers for MoveTooltipStatus.
 */

import type { StatModifierDirection, StatModifierStatusClass } from '@/types/battle/tooltip';

export const STAT_MODIFIER_ARROWS = ['▲', '▼'] as const;
export type StatModifierArrow = (typeof STAT_MODIFIER_ARROWS)[number];

export function getTargetCssClass(isSelf?: boolean): StatModifierStatusClass {
  return isSelf ? 'boosted' : 'penalized';
}

export function getDirectionCssClass(direction?: StatModifierDirection): StatModifierStatusClass {
  return direction === 'up' ? 'boosted' : 'penalized';
}

export function getTargetArrow(isSelf?: boolean): StatModifierArrow {
  return isSelf ? '▲' : '▼';
}

export function getDirectionArrow(direction?: StatModifierDirection): StatModifierArrow {
  return direction === 'up' ? '▲' : '▼';
}

export function formatStageValue(stage?: number): string {
  const val = stage ?? 0;
  return `${val >= 0 ? '+' : ''}${val}`;
}

export function getStageRangeLabel(currentStage?: number, finalStage?: number): string {
  return `${formatStageValue(currentStage)} ➔ ${formatStageValue(finalStage)}`;
}
