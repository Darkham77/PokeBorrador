import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-061: cant truancy message', () => {
  it('should parse cant truancy reason correctly', () => {
    let logMsg = '';
    const target = { name: 'Slaking' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: 'cant',
      parts: ['', 'cant', 'p1a: Slaking', 'ability: Truant'],
      line: '|cant|p1a: Slaking|ability: Truant',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('Truant');
  });
});
