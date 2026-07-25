import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-071: prepare move log style', () => {
  it('should use player log style for player prepare moves', async () => {
    let logStyle = '';
    const attacker = { name: 'SolarBeamUser' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (_msg: string, style: string) => { logStyle = style; } },
      type: '-prepare',
      parts: ['', '-prepare', 'p1a: SolarBeamUser', 'Solar Beam'],
      line: '|-prepare|p1a: SolarBeamUser|Solar Beam',
      p: attacker,
      getPoke: () => attacker,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logStyle).toBe('log-player');
  });
});
