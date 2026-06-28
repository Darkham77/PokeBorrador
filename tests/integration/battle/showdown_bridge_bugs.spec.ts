import { describe, it, expect, vi } from 'vitest';
import { createMockBattleContext } from '../../../scripts/battle-tester/mock-battle-store.ts';
import { parseShowdownLogLine } from '../../../src/logic/battle/showdownBridge.ts';
import { logger } from '../../../src/logic/utils/logger.ts';
import { toID } from '@pkmn/sim';

import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function createLocalPoke(name: string, species: string) {
  return {
    uid: Math.random().toString(36).substring(2, 11),
    id: toID(species),
    name: name,
    level: 100,
    hp: 400,
    maxHp: 400,
    ability: 'noability',
    status: null,
    volatileCounters: {},
    moves: [{ id: 'tackle', name: 'Tackle', pp: 20, maxPP: 20 }]
  } as unknown as Pokemon;
}

describe('ShowdownBridge Unhandled Logs Regression Tests', () => {
  it('debería manejar el evento de fin de combate |win| sin reportar logs no controlados', async () => {
    const p1 = createLocalPoke('P-Poke1', 'Mew');
    const p2 = createLocalPoke('E-Poke1', 'Blissey');
    const mockStore = createMockBattleContext(p1, p2);

    const debugSpy = vi.spyOn(logger, 'debug');
    await parseShowdownLogLine(mockStore, '|win|Player');

    const unhandledCalls = debugSpy.mock.calls.filter(args => 
      args[1]?.toString().includes('sin parseador visual específico')
    );
    expect(unhandledCalls.length).toBe(0);
    debugSpy.mockRestore();
  });

  it('debería manejar eventos de animación |-anim| sin reportar logs no controlados', async () => {
    const p1 = createLocalPoke('P-Poke1', 'Mew');
    const p2 = createLocalPoke('E-Poke1', 'Blissey');
    const mockStore = createMockBattleContext(p1, p2);

    const debugSpy = vi.spyOn(logger, 'debug');
    await parseShowdownLogLine(mockStore, '|-anim|p1a: P-Poke1|Dragon Darts|p2a: E-Poke1');

    const unhandledCalls = debugSpy.mock.calls.filter(args => 
      args[1]?.toString().includes('sin parseador visual específico')
    );
    expect(unhandledCalls.length).toBe(0);
    debugSpy.mockRestore();
  });

  it('debería manejar eventos de activación de campo |-fieldactivate| sin reportar logs no controlados', async () => {
    const p1 = createLocalPoke('P-Poke1', 'Mew');
    const p2 = createLocalPoke('E-Poke1', 'Blissey');
    const mockStore = createMockBattleContext(p1, p2);

    const debugSpy = vi.spyOn(logger, 'debug');
    await parseShowdownLogLine(mockStore, '|-fieldactivate|move: Fairy Lock');

    const unhandledCalls = debugSpy.mock.calls.filter(args => 
      args[1]?.toString().includes('sin parseador visual específico')
    );
    expect(unhandledCalls.length).toBe(0);
    debugSpy.mockRestore();
  });
});
