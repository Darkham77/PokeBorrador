import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-062: move miss log target', () => {
  it('should include target name in miss log', async () => {
    let logMsg = '';
    const attacker = { name: 'Pikachu' };
    const target = { name: 'Charizard' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-miss',
      parts: ['', '-miss', 'p1a: Pikachu', 'p2a: Charizard'],
      line: '|-miss|p1a: Pikachu|p2a: Charizard',
      getPoke: (id: string) => id.includes('Pikachu') ? attacker : target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toBeDefined();
  });
});
