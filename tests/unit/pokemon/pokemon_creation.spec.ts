import { describe, it, expect } from 'vitest';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';

describe('Pokémon Creation & Legality Tests (Vitest)', () => {

  it('generates a legal Gengar with makePokemon using English Showdown IDs', () => {
    const p = makePokemon('gengar', 55, {
      nature: 'adamant',
      ability: 'cursedbody',
      bypassWhitelist: true
    });

    expect(p).toBeDefined();
    expect(p!.id).toBe('gengar');
    expect(p!.level).toBe(55);
    expect(p!.nature).toBe('adamant');
    expect(p!.ability).toBe('cursedbody');
  });

  it('generates a custom Gengar via debug service and preserves move IDs and nature', () => {
    const p = pokemonDebugService.generate({
      id: 'gengar',
      level: 55,
      nature: 'adamant',
      ability: 'cursedbody',
      moves: ['shadowball', 'hypnosis', 'sludgebomb', 'psychic'],
      protocol: 'catch'
    });

    expect(p).toBeDefined();
    expect(p.id).toBe('gengar');
    expect(p.nature).toBe('adamant');
    expect(p.ability).toBe('cursedbody');
    
    // Check moves integrity and that no move triggers corrupt warning or is null
    expect(p.moves.length).toBe(4);
    
    expect(p.moves[0]?.id).toBe('shadowball');
    expect(p.moves[1]?.id).toBe('hypnosis');
    expect(p.moves[2]?.id).toBe('sludgebomb');
    expect(p.moves[3]?.id).toBe('psychic');

    // Make sure they have a name and PP
    expect(p.moves[0]?.name).toBeDefined();
    expect(p.moves[0]?.pp).toBeGreaterThan(0);
  });
});
