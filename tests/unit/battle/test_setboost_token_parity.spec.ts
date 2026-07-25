import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - Log Token |-setboost|', () => {
  it('should parse |-setboost| token and apply direct stat stage setting', () => {
    const mockStore = {
      playerStages: { value: { atk: 0, def: 0 } },
      enemyStages: { value: { atk: 0, def: 0 } },
      addLog: () => {}
    };

    const targetPokemon = { name: 'Charizard', uid: 'charizard-uid' };

    const ctx = {
      store: mockStore,
      type: '-setboost',
      parts: ['', '-setboost', 'p1a: Charizard', 'atk', '6'],
      line: '|-setboost|p1a: Charizard|atk|6',
      p: targetPokemon,
      getPoke: () => targetPokemon,
      getSide: () => 'player',
      turnLogs: []
    };

    const handled = handleStageEvents(ctx as any);
    
    expect(handled).toBe(true);
    expect(mockStore.playerStages.value.atk).toBe(6);
  });
});
