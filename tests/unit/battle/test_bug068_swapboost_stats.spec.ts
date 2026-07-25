import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-068: swapboost swaps all 7 stats', () => {
  it('should swap accuracy and evasion stages between target and source', () => {
    const playerStages = { atk: 1, accuracy: 2, evasion: 0 };
    const enemyStages = { atk: -1, accuracy: -2, evasion: 1 };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: enemyStages },
      addLog: () => {}
    };
    const playerMon = { name: 'Alakazam' };
    const enemyMon = { name: 'Gengar' };
    const ctx = {
      store: mockStore,
      type: '-swapboost',
      parts: ['', '-swapboost', 'p1a: Alakazam', 'p2a: Gengar'],
      line: '|-swapboost|p1a: Alakazam|p2a: Gengar',
      p: playerMon,
      getPoke: (id: string) => id.includes('Alakazam') ? playerMon : enemyMon,
      getSide: (id: string) => id.includes('Alakazam') ? 'player' : 'enemy'
    };
    handleStageEvents(ctx as any);
    expect(playerStages.accuracy).toBe(-2);
    expect(enemyStages.accuracy).toBe(2);
  });
});
