import { describe, it, expect } from 'vitest';
import { SPECIAL_ACTIONS } from '@/logic/battle/actions/specialActions';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'poke-1',
    id: 'bulbasaur',
    name: 'Bulbasaur',
    level: 50,
    hp: 100,
    maxHp: 100,
    type: 'grass',
    type2: 'poison',
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    status: null,
    nature: 'hardy',
    moves: [],
    ...overrides
  } as unknown as Pokemon;
}

function createStages(overrides: Partial<BattleStages> = {}): BattleStages {
  return {
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    accuracy: 0,
    evasion: 0,
    reflect: 0,
    lightScreen: 0,
    safeguard: 0,
    mist: 0,
    spikes: 0,
    ...overrides
  };
}

describe('Special Battle Actions Mechanics Suite (Tier 1)', () => {
  it('executes leech_seed: fails on grass, seeds non-grass, ignores already seeded', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const grassTgt = createMockPokemon({ name: 'Oddish', type: 'grass' });
    SPECIAL_ACTIONS['leech_seed']?.(createMockPokemon(), grassTgt, createStages(), createStages(), addLog);
    expect(logs).toContain('¡No afecta a Oddish!');
    expect(grassTgt.seeded).toBeFalsy();

    const waterTgt = createMockPokemon({ name: 'Squirtle', type: 'water', type2: null });
    SPECIAL_ACTIONS['leech_seed']?.(createMockPokemon(), waterTgt, createStages(), createStages(), addLog);
    expect(waterTgt.seeded).toBe(true);
    expect(logs).toContain('¡Squirtle fue infectado por drenadoras!');

    SPECIAL_ACTIONS['leech_seed']?.(createMockPokemon(), waterTgt, createStages(), createStages(), addLog);
    expect(logs).toContain('¡Squirtle ya está infectado!');
  });

  it('executes curse: ghost sacrifices HP to curse target, non-ghost boosts atk/def and lowers spe', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const ghostSrc = createMockPokemon({ name: 'Gengar', type: 'ghost', type2: 'poison', hp: 100, maxHp: 100 });
    const tgt = createMockPokemon({ name: 'Pikachu', type: 'electric', type2: null });
    const srcStages = createStages();

    SPECIAL_ACTIONS['curse']?.(ghostSrc, tgt, srcStages, createStages(), addLog);
    expect(ghostSrc.hp).toBe(50);
    expect(tgt.cursed).toBe(true);

    const normalSrc = createMockPokemon({ name: 'Snorlax', type: 'normal', type2: null });
    const normalStages = createStages();
    SPECIAL_ACTIONS['curse']?.(normalSrc, tgt, normalStages, createStages(), addLog);
    expect(normalStages.atk).toBe(1);
    expect(normalStages.def).toBe(1);
    expect(normalStages.spe).toBe(-1);
  });

  it('executes destiny_bond and perish_song counters', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const src = createMockPokemon({ name: 'Gengar' });
    SPECIAL_ACTIONS['destiny_bond']?.(src, createMockPokemon(), createStages(), createStages(), addLog);
    expect(src.destinyBond).toBe(true);

    const perishTgt = createMockPokemon({ name: 'Lapras' });
    SPECIAL_ACTIONS['perish_song']?.(src, perishTgt, createStages(), createStages(), addLog);
    expect(src.perishSongCount).toBe(3);
    expect(perishTgt.perishSongCount).toBe(3);
  });

  it('executes transform: copies target stats, types, and sets move PP to 5', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const ditto = createMockPokemon({
      id: 'ditto',
      name: 'Ditto',
      type: 'normal',
      type2: null,
      atk: 48,
      moves: [{ id: 'transform', name: 'Transform', pp: 10, maxPP: 10 } as any]
    });
    const charizard = createMockPokemon({
      id: 'charizard',
      name: 'Charizard',
      type: 'fire',
      type2: 'flying',
      atk: 100,
      def: 80,
      spa: 110,
      spd: 85,
      spe: 100,
      moves: [
        { id: 'flamethrower', name: 'Flamethrower', pp: 15, maxPP: 15 } as any,
        { id: 'airslash', name: 'Air Slash', pp: 20, maxPP: 20 } as any
      ]
    });

    SPECIAL_ACTIONS['transform']?.(ditto, charizard, createStages(), createStages(), addLog);

    expect(ditto.isTransformed).toBe(true);
    expect(ditto.id).toBe('charizard');
    expect(ditto.name).toBe('Charizard');
    expect(ditto.type).toBe('fire');
    expect(ditto.type2).toBe('flying');
    expect(ditto.atk).toBe(100);
    expect(ditto.originalDitto).toBeTruthy();
    expect(ditto.moves[0]?.pp).toBe(5);
    expect(ditto.moves[0]?.maxPP).toBe(5);
  });

  it('executes belly_drum, endure, protect, and rapid_spin hazards clearing', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const src = createMockPokemon({ hp: 100, maxHp: 100 });
    const stages = createStages();

    SPECIAL_ACTIONS['belly_drum']?.(src, createMockPokemon(), stages, createStages(), addLog);
    expect(src.hp).toBe(50);
    expect(stages.atk).toBe(6);

    SPECIAL_ACTIONS['endure']?.(src, createMockPokemon(), stages, createStages(), addLog);
    expect(src.endure).toBe(true);

    SPECIAL_ACTIONS['protect']?.(src, createMockPokemon(), stages, createStages(), addLog);
    expect(src.protect).toBe(true);

    src.seeded = true;
    src.bound = 3;
    stages.spikes = 2;
    SPECIAL_ACTIONS['rapid_spin']?.(src, createMockPokemon(), stages, createStages(), addLog);
    expect(src.seeded).toBe(false);
    expect(src.bound).toBe(0);
    expect(stages.spikes).toBe(0);
  });

  it('executes item and ability swaps: trick, skill_swap, and self faints: explosion', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const src = createMockPokemon({ name: 'Alakazam', heldItem: 'leftovers', ability: 'magicguard' });
    const tgt = createMockPokemon({ name: 'Machamp', heldItem: 'choicescarf', ability: 'noguard' });

    SPECIAL_ACTIONS['trick']?.(src, tgt, createStages(), createStages(), addLog);
    expect(src.heldItem).toBe('choicescarf');
    expect(tgt.heldItem).toBe('leftovers');

    SPECIAL_ACTIONS['skill_swap']?.(src, tgt, createStages(), createStages(), addLog);
    expect(src.ability).toBe('noguard');
    expect(tgt.ability).toBe('magicguard');

    SPECIAL_ACTIONS['explosion']?.(src, tgt, createStages(), createStages(), addLog);
    expect(src.hp).toBe(0);
  });

  it('executes stockpile and spit_up volatile counters', () => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(msg);

    const src = createMockPokemon({ name: 'Swalot' });
    SPECIAL_ACTIONS['stockpile']?.(src, createMockPokemon(), createStages(), createStages(), addLog);
    expect(src.volatileCounters?.['stockpile']).toBe(1);

    SPECIAL_ACTIONS['stockpile']?.(src, createMockPokemon(), createStages(), createStages(), addLog);
    expect(src.volatileCounters?.['stockpile']).toBe(2);

    SPECIAL_ACTIONS['spit_up']?.(src, createMockPokemon(), createStages(), createStages(), addLog);
    expect(src.volatileCounters?.['stockpile']).toBe(0);

    SPECIAL_ACTIONS['spit_up']?.(src, createMockPokemon(), createStages(), createStages(), addLog);
    expect(logs).toContain('¡Pero falló porque no tenía energía acumulada!');
  });
});
