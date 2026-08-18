import { describe, it, expect } from 'vitest';
import {
  getTargetCssClass,
  getDirectionCssClass,
  getTargetArrow,
  getDirectionArrow,
  formatStageValue,
  getStageRangeLabel
} from '@/components/battle/moveTooltipStatusHelper';

describe('moveTooltipStatusHelper', () => {
  it('correctly maps target CSS class and arrow for self vs opponent', () => {
    expect(getTargetCssClass(true)).toBe('boosted');
    expect(getTargetCssClass(false)).toBe('penalized');
    expect(getTargetArrow(true)).toBe('▲');
    expect(getTargetArrow(false)).toBe('▼');
  });

  it('correctly maps direction CSS class and arrow for up vs down', () => {
    expect(getDirectionCssClass('up')).toBe('boosted');
    expect(getDirectionCssClass('down')).toBe('penalized');
    expect(getDirectionCssClass(undefined)).toBe('penalized');
    expect(getDirectionArrow('up')).toBe('▲');
    expect(getDirectionArrow('down')).toBe('▼');
    expect(getDirectionArrow(undefined)).toBe('▼');
  });

  it('formats positive and negative stages correctly', () => {
    expect(formatStageValue(2)).toBe('+2');
    expect(formatStageValue(0)).toBe('+0');
    expect(formatStageValue(-1)).toBe('-1');
    expect(formatStageValue(undefined)).toBe('+0');
  });

  it('formats stage range label correctly', () => {
    expect(getStageRangeLabel(0, 1)).toBe('+0 ➔ +1');
    expect(getStageRangeLabel(1, -2)).toBe('+1 ➔ -2');
  });
});
