import { describe, expect, it } from 'vitest';
import { selectNaturalFinishingMoveIndex } from '../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';

describe('selectNaturalFinishingMoveIndex', () => {
  it('prefers the strongest legal damaging move after the objective is covered', () => {
    expect(selectNaturalFinishingMoveIndex([
      { id: 'protect', pp: 10 },
      { id: 'flamethrower', pp: 10 },
      { id: 'tackle', pp: 10 },
    ])).toBe(1);
  });
});
