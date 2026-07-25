import { describe, it, expect } from 'vitest';
import { handleStageEvents } from '@/logic/battle/showdownBridgeStages';

describe('Audit Parity - BUG-069: copyboost copies all 7 stats', () => {
  it('should copy accuracy and evasion stages from source to recipient', () => {
    const playerStages = { atk: 0, accuracy: 0, evasion: 0 };
    const enemyStages = { atk: 3, accuracy: 2, evasion: -1 };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: enemyStages },
      addLog: () => {}
    };
    const playerMon = { name: 'Smeargle' };
    const enemyMon = { name: 'Eevee' };
    const ctx = {
      store: mockStore,
      type: '-copyboost',
      parts: ['', '-copyboost', 'p1a: Smeargle', 'p2a: Eevee'],
      line: '|-copyboost|p1a: Smeargle|p2a: Eevee',
      p: playerMon,
      getPoke: (id: string) => id.includes('Smeargle') ? playerMon : enemyMon,
      getSide: (id: string) => id.includes('Smeargle') ? 'player' : 'enemy'
    };
    handleStageEvents(ctx as any);
    expect(playerStages.accuracy).toBe(2);
    expect(playerStages.evasion).toBe(-1);
  });
});
