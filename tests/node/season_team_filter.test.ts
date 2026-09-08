import { describe, it, expect } from 'vitest';
import { evaluatePokemonForSeason, buildAutoRankedTeam } from '@/logic/pvp/seasonTeamFilter';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { SeasonalThemeConfig } from '@/data/system/rankedData';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonType } from '@/data/battle/types';

function createMockPokemon(partial: Partial<Pokemon> & { type2?: PokemonType }): Pokemon {
  const species = (partial.species || 'pikachu') as PokemonSpeciesId;
  return {
    uid: partial.uid || `poke_${Date.now()}_${Math.random()}`,
    id: species,
    species,
    name: partial.name || 'Pikachu',
    level: partial.level || 50,
    type: partial.type || 'electric',
    type2: partial.type2 || null,
    hp: 100,
    maxHp: 100,
    atk: 55,
    def: 40,
    spa: 50,
    spd: 50,
    spe: 90,
    ivs: partial.ivs || { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: ['thunderbolt'],
    nature: 'hardy',
    isShiny: false,
    ...partial
  } as unknown as Pokemon;
}

describe('Season Team Filter & Auto-Builder', () => {
  it('correctly filters pokemon by allowed types', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      allowedTypes: ['fire', 'water'],
      bannedPokemonIds: []
    };

    const firePoke = createMockPokemon({ species: 'charmander', type: 'fire' });
    const waterPoke = createMockPokemon({ species: 'squirtle', type: 'water' });
    const grassPoke = createMockPokemon({ species: 'bulbasaur', type: 'grass', type2: 'poison' });

    expect(evaluatePokemonForSeason(firePoke, rules as SeasonalThemeConfig).eligible).toBe(true);
    expect(evaluatePokemonForSeason(waterPoke, rules as SeasonalThemeConfig).eligible).toBe(true);
    expect(evaluatePokemonForSeason(grassPoke, rules as SeasonalThemeConfig).eligible).toBe(false);
  });

  it('rejects banned pokemon', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      allowedTypes: ['psychic'],
      bannedPokemonIds: ['mewtwo']
    };

    const mewtwo = createMockPokemon({ species: 'mewtwo', type: 'psychic' });
    const alakazam = createMockPokemon({ species: 'alakazam', type: 'psychic' });

    expect(evaluatePokemonForSeason(mewtwo, rules as SeasonalThemeConfig).eligible).toBe(false);
    expect(evaluatePokemonForSeason(alakazam, rules as SeasonalThemeConfig).eligible).toBe(true);
  });

  it('enforces requiresMonotype strictly', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      allowedTypes: ['fire', 'flying'],
      requiresMonotype: true
    };

    const charmander = createMockPokemon({ species: 'charmander', type: 'fire' });
    const charizard = createMockPokemon({ species: 'charizard', type: 'fire', type2: 'flying' });

    expect(evaluatePokemonForSeason(charmander, rules as SeasonalThemeConfig).eligible).toBe(true);
    expect(evaluatePokemonForSeason(charizard, rules as SeasonalThemeConfig).eligible).toBe(false);
  });

  it('enforces requiresDualType and all dual types must be in allowedTypes', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      allowedTypes: ['fire', 'flying'],
      requiresDualType: true
    };

    const charmander = createMockPokemon({ species: 'charmander', type: 'fire' });
    const charizard = createMockPokemon({ species: 'charizard', type: 'fire', type2: 'flying' });
    const zapdos = createMockPokemon({ species: 'zapdos', type: 'electric', type2: 'flying' });

    expect(evaluatePokemonForSeason(charmander, rules as SeasonalThemeConfig).eligible).toBe(false);
    expect(evaluatePokemonForSeason(charizard, rules as SeasonalThemeConfig).eligible).toBe(true);
    expect(evaluatePokemonForSeason(zapdos, rules as SeasonalThemeConfig).eligible).toBe(false);
  });

  it('enforces isLittleCup (only unevolved/baby, max level 5)', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      isLittleCup: true,
      levelCap: 5
    };

    const pichu = createMockPokemon({ species: 'pichu', level: 5 });
    const pikachu = createMockPokemon({ species: 'pikachu', level: 5 });
    const highLevelPichu = createMockPokemon({ species: 'pichu', level: 10 });

    expect(evaluatePokemonForSeason(pichu, rules as SeasonalThemeConfig).eligible).toBe(true);
    expect(evaluatePokemonForSeason(pikachu, rules as SeasonalThemeConfig).eligible).toBe(false);
    expect(evaluatePokemonForSeason(highLevelPichu, rules as SeasonalThemeConfig).eligible).toBe(false);
  });

  it('buildAutoRankedTeam selects top 6 eligible pokemon sorted by strength', () => {
    const rules: Partial<SeasonalThemeConfig> = {
      allowedTypes: ['fire', 'water']
    };

    const pool = [
      createMockPokemon({ uid: 'u1', species: 'charmander', type: 'fire', level: 30, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } }),
      createMockPokemon({ uid: 'u2', species: 'charizard', type: 'fire', type2: 'flying', level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }),
      createMockPokemon({ uid: 'u3', species: 'squirtle', type: 'water', level: 20 }),
      createMockPokemon({ uid: 'u4', species: 'blastoise', type: 'water', level: 50, ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 } }),
      createMockPokemon({ uid: 'u5', species: 'bulbasaur', type: 'grass', level: 60 }),
      createMockPokemon({ uid: 'u6', species: 'vaporeon', type: 'water', level: 45 }),
      createMockPokemon({ uid: 'u7', species: 'magmar', type: 'fire', level: 48 }),
      createMockPokemon({ uid: 'u8', species: 'arcanine', type: 'fire', level: 52 }),
      createMockPokemon({ uid: 'u9', species: 'gyarados', type: 'water', type2: 'flying', level: 55 })
    ];

    const team = buildAutoRankedTeam(pool, rules as SeasonalThemeConfig, 6);
    expect(team.length).toBe(6);
    expect(team.some(p => p.species === 'bulbasaur')).toBe(false);
    for (const member of team) {
      expect(evaluatePokemonForSeason(member, rules as SeasonalThemeConfig).eligible).toBe(true);
    }
  });
});
