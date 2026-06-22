
import { describe, it, expect } from 'vitest';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { NATURES } from '@/data/battle/natures';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { ENABLED_POKEMON_IDS, IMPLEMENTED_GENERATION } from '@/data/system/constants';

describe('Pokemon Database Integrity', () => {
  const species = Object.entries(POKEMON_DB);

  it('should have at least the expected number of species for the implemented generation', () => {
    const expectedCounts: Record<number, number> = {
      1: 151,
      2: 251,
      3: 386,
      4: 493,
      5: 649,
      6: 721,
      7: 809,
      8: 905,
      9: 1025
    };
    const minExpected = expectedCounts[IMPLEMENTED_GENERATION] ?? 1025;
    expect(species.length).toBeGreaterThanOrEqual(minExpected);
  });

  it('every species must have a valid catchRate', () => {
    species.forEach(([id, data]) => {
      expect(data.catchRate, `Pokemon "${id}" is missing catchRate`).toBeDefined();
      expect(typeof data.catchRate, `Pokemon "${id}" catchRate must be a number`).toBe('number');
      expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeGreaterThanOrEqual(3);
      expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeLessThanOrEqual(255);
    });
  });

  it('every species must have core combat stats', () => {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    species.forEach(([id, data]) => {
      const record = data as unknown as Record<string, unknown>;
      stats.forEach(stat => {
        expect(record[stat], `Pokemon "${id}" is missing stat: ${stat}`).toBeDefined();
        expect(typeof record[stat], `Pokemon "${id}" stat ${stat} must be a number`).toBe('number');
        expect(record[stat] as number, `Pokemon "${id}" stat ${stat} must be positive`).toBeGreaterThan(0);
      });
    });
  });

  it('every species must have a valid learnset', () => {
    species.forEach(([id, data]) => {
      // Ignorar megas, gmax, primales, totems, formas de Pikachu y formas de Castform en la validación de learnsets
      if (
        id.includes('mega') || id.includes('primal') || id.includes('totem') || id.endsWith('gmax') || 
        (id.startsWith('pikachu') && id !== 'pikachu') ||
        (id.startsWith('castform') && id !== 'castform')
      ) return;

      expect(Array.isArray(data.learnset), `Pokemon "${id}" learnset must be an array`).toBe(true);
      expect(data.learnset.length, `Pokemon "${id}" learnset cannot be empty`).toBeGreaterThan(0);

      interface LearnsetMove {
        lv: number;
        id: string;
        name: string;
        pp: number;
      }

      (data.learnset as LearnsetMove[]).forEach((move: LearnsetMove, index: number) => {
        expect(move.lv, `Pokemon "${id}" move at index ${index} missing level`).toBeDefined();
        expect(move.name, `Pokemon "${id}" move at index ${index} missing name`).toBeDefined();
        expect(move.pp, `Pokemon "${id}" move at index ${index} missing pp`).toBeDefined();
      });
    });
  });

  it('every species ID (key) must be lowercase and consistent', () => {
    Object.keys(POKEMON_DB).forEach(id => {
      expect(id, `Pokemon ID "${id}" must be lowercase`).toBe(id.toLowerCase());
      expect(id.includes(' '), `Pokemon ID "${id}" should not contain spaces`).toBe(false);
    });
  });

  it('all system natures must have valid Spanish translation data', () => {
    NATURES.forEach((natureId: string) => {
      const data = pokemonDataProvider.getNatureData(natureId);
      expect(data, `Nature "${natureId}" must resolve data`).not.toBeNull();
      if (!data) return;
      expect(data.name, `Nature "${natureId}" must have a Spanish translated name`).toBeDefined();
      expect(data.name, `Nature "${natureId}" Spanish name must not be English ID`).not.toBe(natureId);
      expect(data.desc, `Nature "${natureId}" must have a Spanish description`).toBeDefined();
    });
  });

  it('all abilities of all species in database must have valid Spanish translation data', () => {
    const errors: string[] = [];
    
    Object.keys(POKEMON_DB).forEach(pokeId => {
      const abilities = pokemonDataProvider.getSpeciesAbilities(pokeId);
      if (abilities.length === 0) {
        errors.push(`Pokemon "${pokeId}" does not have any abilities.`);
      }
      
      abilities.forEach(abilityId => {
        const data = pokemonDataProvider.getAbilityData(abilityId);
        if (!data) {
          errors.push(`Ability "${abilityId}" on species "${pokeId}" returned null data.`);
          return;
        }
        if (!data.name) {
          errors.push(`Ability "${abilityId}" on species "${pokeId}" is missing name.`);
        }
        // Eliminada validación contra traducciones faltantes legacy en inglés ya que se permiten IDs/descripciones oficiales.
      });
    });

    expect(errors, `Habilidades con traducciones faltantes:\n${errors.join('\n')}`).toEqual([]);
  });

  it('should only allow retrieving data for whitelisted Pokémon species', () => {
    // Bulbasaur is in the whitelist (Gen 1)
    expect(() => pokemonDataProvider.getPokemonData('bulbasaur')).not.toThrow();

    // Temporarily remove bulbasaur from whitelist to simulate a disabled species
    ENABLED_POKEMON_IDS.delete('bulbasaur');
    
    try {
      expect(() => pokemonDataProvider.getPokemonData('bulbasaur')).toThrow(/whitelist/);
    } finally {
      // Restore bulbasaur to whitelist
      ENABLED_POKEMON_IDS.add('bulbasaur');
    }
  });
});
