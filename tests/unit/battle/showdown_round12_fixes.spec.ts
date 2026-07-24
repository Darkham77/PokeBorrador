import { describe, it, expect } from 'vitest';
import { handleStageEvents, SHOWDOWN_STAT_KEYS } from '@/logic/battle/showdownBridgeStages';
import type { SBCtx } from '@/logic/battle/showdownBridgeCtx';
import type { BattleStages } from '@/types/battle/battle';

describe('Showdown Round 12 Native Parity Fixes', () => {
  it('should use native Showdown stat keys (accuracy, evasion, atk, def, spa, spd, spe)', () => {
    expect(SHOWDOWN_STAT_KEYS).toEqual(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion']);
  });

  it('should correctly modify accuracy and evasion without conversion tables', () => {
    const playerStages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0,
    };

    const mockPoke = { name: 'Pikachu' };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 } },
      addLog: () => {},
    };

    const mockCtx: Partial<SBCtx> = {
      store: mockStore as unknown as SBCtx['store'],
      type: '-boost',
      parts: ['', '-boost', 'p1a: Pikachu', 'accuracy', '2'],
      line: '|-boost|p1a: Pikachu|accuracy|2',
      p: mockPoke as unknown as SBCtx['p'],
      getPoke: () => mockPoke as unknown as SBCtx['p'],
    };

    const handled = handleStageEvents(mockCtx as SBCtx);
    expect(handled).toBe(true);
    expect(playerStages.accuracy).toBe(2);
    expect(playerStages.evasion).toBe(0);
  });

  it('should strictly limit clearboost/invertboost to stat keys and preserve screens/hazards', () => {
    const playerStages: BattleStages = {
      atk: 2, def: -1, spa: 0, spd: 0, spe: 1, accuracy: 1, evasion: -1,
      reflect: 1, lightScreen: 1, safeguard: 0, mist: 0, spikes: 2,
    };

    const mockPoke = { name: 'Pikachu' };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: { ...playerStages } },
      addLog: () => {},
    };

    const mockCtx: Partial<SBCtx> = {
      store: mockStore as unknown as SBCtx['store'],
      type: '-clearboost',
      parts: ['-clearboost', 'p1a: Pikachu'],
      line: '|-clearboost|p1a: Pikachu',
      p: mockPoke as unknown as SBCtx['p'],
      getPoke: () => mockPoke as unknown as SBCtx['p'],
    };

    handleStageEvents(mockCtx as SBCtx);

    // Stat stages should reset to 0
    expect(playerStages.atk).toBe(0);
    expect(playerStages.def).toBe(0);
    expect(playerStages.accuracy).toBe(0);
    expect(playerStages.evasion).toBe(0);

    // Screens and hazards MUST remain intact
    expect(playerStages.reflect).toBe(1);
    expect(playerStages.lightScreen).toBe(1);
    expect(playerStages.spikes).toBe(2);
  });
});
