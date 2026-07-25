import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - Ability Trace Origin', () => {
  it('should parse ability token with Trace origin', () => {
    let capturedLog = '';
    const mockStore = {
      addLog: (msg: string) => { capturedLog = msg; }
    };
    const mockPoke = { name: 'Alakazam' };
    const ctx = {
      store: mockStore,
      type: '-ability',
      parts: ['', '-ability', 'p1a: Alakazam', 'Intimidate', '[from] ability: Trace', '[of] p2a: Gyarados'],
      line: '|-ability|p1a: Alakazam|Intimidate|[from] ability: Trace|[of] p2a: Gyarados',
      getPoke: (str: string) => str.includes('p1a') ? mockPoke : { name: 'Gyarados' }
    };
    const handled = handleMiscEvents(ctx as any);
    expect(handled).toBe(true);
    expect(capturedLog).toContain('Trace');
  });
});
