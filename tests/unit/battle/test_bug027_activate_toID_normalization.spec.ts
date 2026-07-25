import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-027: -activate uses forbidden .replace() normalization instead of toID()', () => {
  it('should use toID()-equivalent normalization — "Speed Boost" must map to "speedboost" consistently', () => {
    let recordedKey: string | null = null;
    const mockPoke = { volatileCounters: {}, name: 'Yanmega', ability: '' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (_msg: string, _style: string, _src: unknown) => {} },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Yanmega', 'ability: Speed Boost'],
      line: '|-activate|p1a: Yanmega|ability: Speed Boost',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // The resulting volatileCounters key must be 'speedboost' (toID output), not any ad-hoc transform
    // If normalization is correct, the key should be 'speedboost'
    recordedKey = Object.keys(mockPoke.volatileCounters)[0] ?? null;
    expect(recordedKey).toBe('speedboost');
  });
});
