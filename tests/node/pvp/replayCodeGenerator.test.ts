import { describe, it, expect } from 'vitest';
import { generateBattleCode, formatBattleCodeInput } from '@/logic/pvp/replayCodeGenerator.ts';
import { isBattleCode } from '@/types/battle/pvp.ts';

describe('Replay Code Generator', () => {
  it('generates canonical BattleCode adhering to BTL-XXXX-XXXX format', () => {
    const code = generateBattleCode();
    expect(isBattleCode(code)).toBe(true);
    expect(code).toMatch(/^BTL-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('generates unique battle codes across 100 iterations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateBattleCode());
    }
    expect(codes.size).toBe(100);
  });

  it('formats raw user inputs correctly into BTL-XXXX-XXXX masks', () => {
    expect(formatBattleCodeInput('btla7x9k24a')).toBe('BTL-A7X9-K24A');
    expect(formatBattleCodeInput('BTL-9182-ABCD')).toBe('BTL-9182-ABCD');
    expect(formatBattleCodeInput('a7x9k24a')).toBe('A7X9-K24A');
    expect(formatBattleCodeInput('btl')).toBe('BTL-');
    expect(formatBattleCodeInput('btl12')).toBe('BTL-12');
  });
});
