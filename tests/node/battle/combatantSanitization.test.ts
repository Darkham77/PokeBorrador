import { describe, it, expect } from 'vitest';
import { serializePokemonTeam, deserializePokemonTeam } from '@/logic/auth/saveSerializer';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Combatant Sanitization - Unit Tests', () => {
  const dirtyPokemon: Pokemon = {
    uid: 'dirty-charizard-1',
    id: 'charizard',
    species: 'charizard',
    name: 'Charizard',
    level: 50,
    hp: 128,
    maxHp: 151,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    type: 'fire',
    type2: 'flying',
    moves: [],
    status: 'psn',
    statusTurns: 2,
    sleepTurns: 0,
    friendship: 100,
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'timid',
    ability: 'blaze',
    gender: 'm',
    tags: [],
    obtainedAt: Date.now(),
    obtainedMethod: 'wild',
    isShiny: false,
    catchRate: 45,
    exp: 0,
    expNeeded: 1000,
    cursed: true,
    confused: 3,
    seeded: true,
    isGuardian: true,
    volatileCounters: { flinch: 1, curse: 1 }
  };

  it('serializePokemonTeam sanitiza salud al 100%, borra status, maldición y estados volátiles residuales', () => {
    const serialized = serializePokemonTeam([dirtyPokemon]);
    expect(serialized).toHaveLength(1);
    const mon = serialized[0]!;
    expect(mon.hp).toBe(151);
    expect(mon.maxHp).toBe(151);
    expect(mon.status).toBe('');
    expect(mon.statusTurns).toBe(0);
    expect(mon.cursed).toBe(false);
    expect(mon.confused).toBe(0);
    expect(mon.seeded).toBe(false);
    expect(mon.isGuardian).toBe(false);
    expect(mon.volatileCounters).toEqual({});
  });

  it('deserializePokemonTeam sanitiza salud al 100%, borra status, maldición y estados volátiles residuales', () => {
    const json = JSON.stringify([dirtyPokemon]);
    const deserialized = deserializePokemonTeam(json);
    expect(deserialized).toHaveLength(1);
    const mon = deserialized[0]!;
    expect(mon.hp).toBe(151);
    expect(mon.maxHp).toBe(151);
    expect(mon.status).toBe('');
    expect(mon.cursed).toBe(false);
    expect(mon.confused).toBe(0);
    expect(mon.seeded).toBe(false);
    expect(mon.isGuardian).toBe(false);
    expect(mon.volatileCounters).toEqual({});
  });
});
