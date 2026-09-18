import { describe, it, expect } from 'vitest';
import type { ShowdownBoostStatKey } from '@/types/pokemon/pokemon';

// We test clearDirectionalStages logic directly
function clearDirectionalStages(
  stages: Record<ShowdownBoostStatKey, number> | undefined,
  direction: 'positive' | 'negative'
): boolean {
  if (!stages) return false;
  const keys: readonly ShowdownBoostStatKey[] = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
  let cleared = false;
  for (const key of keys) {
    const val = stages[key] || 0;
    const shouldClear = direction === 'positive' ? val > 0 : val < 0;
    if (shouldClear) {
      stages[key] = 0;
      cleared = true;
    }
  }
  return cleared;
}

describe('showdownBridgeStages - clearDirectionalStages', () => {
  it('clears only positive boosts when direction is positive', () => {
    const stages: Record<ShowdownBoostStatKey, number> = {
      atk: 2,
      def: -1,
      spa: 0,
      spd: 3,
      spe: -2,
      accuracy: 1,
      evasion: 0
    };

    const cleared = clearDirectionalStages(stages, 'positive');
    expect(cleared).toBe(true);
    expect(stages.atk).toBe(0);
    expect(stages.spd).toBe(0);
    expect(stages.accuracy).toBe(0);
    expect(stages.def).toBe(-1);
    expect(stages.spe).toBe(-2);
  });

  it('clears only negative unboosts when direction is negative', () => {
    const stages: Record<ShowdownBoostStatKey, number> = {
      atk: 2,
      def: -1,
      spa: 0,
      spd: 3,
      spe: -2,
      accuracy: 1,
      evasion: 0
    };

    const cleared = clearDirectionalStages(stages, 'negative');
    expect(cleared).toBe(true);
    expect(stages.atk).toBe(2);
    expect(stages.spd).toBe(3);
    expect(stages.def).toBe(0);
    expect(stages.spe).toBe(0);
  });

  it('returns false when no stages match the direction', () => {
    const stages: Record<ShowdownBoostStatKey, number> = {
      atk: 0,
      def: -1,
      spa: 0,
      spd: 0,
      spe: -2,
      accuracy: 0,
      evasion: 0
    };

    const cleared = clearDirectionalStages(stages, 'positive');
    expect(cleared).toBe(false);
  });
});
