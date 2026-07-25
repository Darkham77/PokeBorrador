import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - Normalized Fieldend Terrain Token (|fieldend|)', () => {
  it('should clear active terrain when fieldend receives normalized lowercase terrain token (electricterrain)', async () => {
    const mockStore = {
      activeBattle: {
        value: {
          terrain: 'electricterrain',
          fieldConditions: {}
        }
      },
      addLog: () => {}
    };

    const ctx = {
      store: mockStore,
      type: '-fieldend',
      parts: ['', '-fieldend', 'move: Electric Terrain'],
      line: '|-fieldend|move: Electric Terrain',
      getPoke: () => null,
      playerSide: 'p1'
    };

    // Simulated log line with normalized terrain token 'electricterrain'
    const normalizedCtx = {
      ...ctx,
      parts: ['', '-fieldend', 'electricterrain'],
      line: '|-fieldend|electricterrain'
    };

    await handleFieldEvents(normalizedCtx as any);

    // Expect active battle terrain to be cleared to null
    expect(mockStore.activeBattle.value.terrain).toBeNull();
  });
});
