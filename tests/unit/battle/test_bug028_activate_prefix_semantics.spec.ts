import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-028: -activate must distinguish move: and ability: prefix semantics', () => {
  it('should log different messages for move: activation vs ability: activation', () => {
    const logs: string[] = [];
    const mockPoke = { volatileCounters: {}, name: 'Yanmega', ability: '' };
    const makeCtx = (effectPart: string, line: string) => ({
      store: {
        activeBattle: { value: {} },
        addLog: (msg: string) => logs.push(msg),
      },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Yanmega', effectPart],
      line,
      p: null,
      getPoke: () => ({ ...mockPoke }),
      getSide: () => 'player',
    });

    handleMiscEvents(makeCtx('ability: Speed Boost', '|-activate|p1a: Yanmega|ability: Speed Boost') as unknown as Parameters<typeof handleMiscEvents>[0]);
    const abilityLog = logs.at(-1);

    logs.length = 0;
    handleMiscEvents(makeCtx('move: Confusion Hit', '|-activate|p1a: Yanmega|move: Confusion Hit') as unknown as Parameters<typeof handleMiscEvents>[0]);
    const moveLog = logs.at(-1);

    // Logs should be semantically different — ability vs move activation is different context
    // If both produce identical "X se activó en Y" messages, the semantic distinction is lost
    expect(abilityLog).not.toBe(moveLog);
  });
});
