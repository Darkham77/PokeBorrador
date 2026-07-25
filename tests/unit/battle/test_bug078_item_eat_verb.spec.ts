import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-078: item eat verb log', () => {
  it('should use eat verb when line includes [eat]', () => {
    let logMsg = '';
    const target = { name: 'Snorlax' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-enditem',
      parts: ['', '-enditem', 'p1a: Snorlax', 'Oran Berry', '[eat]'],
      line: '|-enditem|p1a: Snorlax|Oran Berry|[eat]',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('comió');
  });
});
