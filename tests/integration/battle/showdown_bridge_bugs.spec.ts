import { describe, it, expect, vi } from 'vitest';
import { createMockBattleContext } from '../../../scripts/e2e/fuzzer/core/fuzzer_mock_battle_store.ts';
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
  it('keeps every provided enemy combatant in the reactive mock battle state', () => {
    const p1 = createLocalPoke('P-Poke1', 'Mew');
    const p2 = createLocalPoke('E-Poke1', 'Blissey');
    const enemyBench = createLocalPoke('E-Poke2', 'Gengar');

    const mockStore = createMockBattleContext(p1, p2, [p1], [p2, enemyBench]);

    expect(mockStore.activeBattle.value?.enemyTeam).toEqual([p2, enemyBench]);
  });

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

  it('debería filtrar el estado "fnt" a null al parsear un switch con vida 0', async () => {
    const p1 = createLocalPoke('P-Poke1', 'Mew');
    const p2 = createLocalPoke('E-Poke1', 'Blissey');
    const mockStore = createMockBattleContext(p1, p2);
    
    const targetPoke = createLocalPoke('E-Poke2', 'Gengar');
    targetPoke.uid = 'gengar-123';
    mockStore.activeBattle.value!.enemyTeam = [p2, targetPoke];
    
    await parseShowdownLogLine(mockStore, '|switch|p2a: bd56a16e|Gengar, L100|0 fnt|[uids]p2a:bd56a16e=gengar-123');
    
    expect(targetPoke.hp).toBe(0);
    expect(targetPoke.status).toBe('');
  });
});

import { isPokemonStatus } from '../../../src/types/pokemon/pokemon.ts';

describe('PokemonStatus Type Guard', () => {
  it('debería retornar true para estados válidos y cadenas vacías/null/undefined', () => {
    expect(isPokemonStatus('par')).toBe(true);
    expect(isPokemonStatus('brn')).toBe(true);
    expect(isPokemonStatus('psn')).toBe(true);
    expect(isPokemonStatus('slp')).toBe(true);
    expect(isPokemonStatus('frz')).toBe(true);
    expect(isPokemonStatus('tox')).toBe(true);
    expect(isPokemonStatus('')).toBe(true);
    expect(isPokemonStatus(null as any)).toBe(false);
    expect(isPokemonStatus(undefined as any)).toBe(false);
  });

  it('debería retornar false para estados inválidos como fnt', () => {
    expect(isPokemonStatus('fnt')).toBe(false);
    expect(isPokemonStatus('fainted')).toBe(false);
    expect(isPokemonStatus('sleep')).toBe(false);
  });
});
