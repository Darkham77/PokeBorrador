import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-073: heal recoil from clause log', () => {
  it('should format drain/recoil heal log correctly', async () => {
    let logMsg = '';
    const target = { name: 'Venusaur', hp: 50, maxHp: 100 };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-heal',
      parts: ['', '-heal', 'p1a: Venusaur', '80/100', '[from] drain'],
      line: '|-heal|p1a: Venusaur|80/100|[from] drain',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toContain('absorbió');
  });
});
