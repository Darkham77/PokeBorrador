import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - Clean Key Sideend Token', () => {
  it('should remove side condition when sideend has move prefix', () => {
    const mockStore = {
      activeBattle: {
        value: {
          playerSideConditions: {
            reflect: { turns: 5 }
          }
        }
      },
      addLog: () => {}
    };
    const ctx = {
      store: mockStore,
      type: '-sideend',
      parts: ['', '-sideend', 'p1', 'move: Reflect'],
      line: '|-sideend|p1|move: Reflect',
      getSide: () => 'player',
      playerSide: 'p1'
    };
    handleFieldEvents(ctx as any);
    expect(mockStore.activeBattle.value.playerSideConditions.reflect).toBeUndefined();
  });
});
