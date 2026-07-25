import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-065: clearpositiveboost message target', () => {
  it('should include target name in clearpositiveboost log', () => {
    let logMsg = '';
    const target = { name: 'Gyarados' };
    const ctx = {
      store: {
        playerStages: { value: { atk: 2 } },
        enemyStages: { value: {} },
        addLog: (msg: string) => { logMsg = msg; }
      },
      type: '-clearpositiveboost',
      parts: ['', '-clearpositiveboost', 'p1a: Gyarados'],
      line: '|-clearpositiveboost|p1a: Gyarados',
      p: target,
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleStageEvents(ctx as any);
    expect(logMsg).toContain('Gyarados');
  });
});
