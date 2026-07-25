import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-066: clearnegativeboost clears negative stages only', () => {
  it('should reset negative stages to 0 and leave positive ones intact', () => {
    const stages = { atk: -2, def: 2 };
    const mockStore = {
      playerStages: { value: stages },
      enemyStages: { value: {} },
      addLog: () => {}
    };
    const target = { name: 'Dragonite' };
    const ctx = {
      store: mockStore,
      type: '-clearnegativeboost',
      parts: ['', '-clearnegativeboost', 'p1a: Dragonite'],
      line: '|-clearnegativeboost|p1a: Dragonite',
      p: target,
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleStageEvents(ctx as any);
    expect(stages.atk).toBe(0);
    expect(stages.def).toBe(2);
  });
});
