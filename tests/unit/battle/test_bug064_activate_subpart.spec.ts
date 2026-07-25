import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-064: activate subpart parsing', () => {
  it('should parse activate token with nested brackets', () => {
    let logMsg = '';
    const target = { name: 'Shedinja' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Shedinja', 'ability: Wonder Guard'],
      line: '|-activate|p1a: Shedinja|ability: Wonder Guard',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('Wonder Guard');
  });
});
