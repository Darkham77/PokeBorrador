/**
 * src/components/battle/moveTooltipStatsGridHelper.ts
 *
 * Pure presentation formatting helpers for MoveTooltipStatsGrid.
 */

export function formatPowerDisplay(base: number | string, final: number | string): string {
  if (base === final || final === '-' || final === 0 || base === 0) {
    return final === '-' || final === 0 || base === 0 ? '-' : String(final);
  }
  return `${base} ➔ ${final}`;
}

const INFINITE_ACCURACY_VALUE = 1000;

export function formatAccuracyValue(val: number): string {
  return val === INFINITE_ACCURACY_VALUE ? '♾️' : `${val}%`;
}

export function formatAccuracyDisplay(base: number, final: number): string {
  if (base === final) {
    return formatAccuracyValue(base);
  }
  return `${formatAccuracyValue(base)} ➔ ${formatAccuracyValue(final)}`;
}

export function formatStatValueDisplay(base: number, final: number): string {
  if (base === final) {
    return String(base);
  }
  return `${base} ➔ ${final}`;
}

export function getArrowForClass(cssClass?: string): { show: boolean; isUp: boolean } {
  if (cssClass === 'boosted') return { show: true, isUp: true };
  if (cssClass === 'penalized') return { show: true, isUp: false };
  return { show: false, isUp: false };
}

export function getArrowForStage(stage: number): { show: boolean; isUp: boolean } {
  if (stage > 0) return { show: true, isUp: true };
  if (stage < 0) return { show: true, isUp: false };
  return { show: false, isUp: false };
}
