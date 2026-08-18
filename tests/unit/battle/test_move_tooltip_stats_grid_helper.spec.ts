import { describe, it, expect } from 'vitest';
import {
  formatPowerDisplay,
  formatAccuracyValue,
  formatAccuracyDisplay,
  formatStatValueDisplay,
  getArrowForClass,
  getArrowForStage
} from '@/components/battle/moveTooltipStatsGridHelper';

describe('moveTooltipStatsGridHelper', () => {
  it('formats power display correctly', () => {
    expect(formatPowerDisplay(80, 80)).toBe('80');
    expect(formatPowerDisplay('-', '-')).toBe('-');
    expect(formatPowerDisplay(80, 120)).toBe('80 ➔ 120');
  });

  it('formats accuracy value and display correctly', () => {
    expect(formatAccuracyValue(1000)).toBe('♾️');
    expect(formatAccuracyValue(85)).toBe('85%');
    expect(formatAccuracyDisplay(100, 100)).toBe('100%');
    expect(formatAccuracyDisplay(85, 100)).toBe('85% ➔ 100%');
    expect(formatAccuracyDisplay(1000, 1000)).toBe('♾️');
  });

  it('formats stat value display correctly', () => {
    expect(formatStatValueDisplay(150, 150)).toBe('150');
    expect(formatStatValueDisplay(150, 225)).toBe('150 ➔ 225');
  });

  it('resolves arrows for CSS classes', () => {
    expect(getArrowForClass('boosted')).toEqual({ show: true, isUp: true });
    expect(getArrowForClass('penalized')).toEqual({ show: true, isUp: false });
    expect(getArrowForClass('normal')).toEqual({ show: false, isUp: false });
    expect(getArrowForClass(undefined)).toEqual({ show: false, isUp: false });
  });

  it('resolves arrows for stages', () => {
    expect(getArrowForStage(2)).toEqual({ show: true, isUp: true });
    expect(getArrowForStage(-1)).toEqual({ show: true, isUp: false });
    expect(getArrowForStage(0)).toEqual({ show: false, isUp: false });
  });
});
