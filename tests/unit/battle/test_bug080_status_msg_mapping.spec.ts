import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-080: status message custom mappings', () => {
  it('should include target name in status application log', async () => {
    let logMsg = '';
    const target = { name: 'Gengar', status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-status',
      parts: ['', '-status', 'p1a: Gengar', 'psn'],
      line: '|-status|p1a: Gengar|psn',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toContain('Gengar');
    expect(target.status).toBe('psn');
  });
});
