import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-003: Stat stages include accuracy and evasion', () => {
  it('should support boost/unboost for accuracy and evasion stages', () => {
    const mockStore = {
      playerStages: { value: { accuracy: 0, evasion: 0 } },
      enemyStages: { value: { accuracy: 0, evasion: 0 } },
      addLog: () => {}
    };
    const target = { name: 'Pikachu', uid: 'p1' };
    const ctx = {
      store: mockStore,
      type: '-boost',
      parts: ['', '-boost', 'p1a: Pikachu', 'accuracy', '1'],
      line: '|-boost|p1a: Pikachu|accuracy|1',
      p: target,
      getPoke: () => target,
      getSide: () => 'player'
    };

    const handled = handleStageEvents(ctx as any);
    expect(handled).toBe(true);
    expect(mockStore.playerStages.value.accuracy).toBe(1);
  });
});
