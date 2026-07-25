import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-067: invertboost inverts all 7 stats', () => {
  it('should invert accuracy and evasion along with main stats', () => {
    const stages = { atk: 2, accuracy: -1, evasion: 3 };
    const mockStore = {
      playerStages: { value: stages },
      enemyStages: { value: {} },
      addLog: () => {}
    };
    const target = { name: 'Mew' };
    const ctx = {
      store: mockStore,
      type: '-invertboost',
      parts: ['', '-invertboost', 'p1a: Mew'],
      line: '|-invertboost|p1a: Mew',
      p: target,
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleStageEvents(ctx as any);
    expect(stages.atk).toBe(-2);
    expect(stages.accuracy).toBe(1);
    expect(stages.evasion).toBe(-3);
  });
});
