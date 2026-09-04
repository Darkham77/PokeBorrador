import { describe, it, expect } from 'vitest';
import { toNatureId, isNatureId } from '@/data/battle/natures';
import { eggFactory } from '@/logic/breeding/eggFactory';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

describe('Daycare Nature Migration & Strictness (Angianemar Case)', () => {
  it('toNatureId must strictly reject non-canonical Spanish nature strings without runtime fallbacks', () => {
    expect(() => toNatureId('Serio')).toThrow("[natures] Invalid NatureId: 'Serio'");
    expect(() => toNatureId('Firme')).toThrow("[natures] Invalid NatureId: 'Firme'");
    expect(() => toNatureId('Seria')).toThrow("[natures] Invalid NatureId: 'Seria'");
    expect(toNatureId('serious')).toBe('serious');
    expect(toNatureId('adamant')).toBe('adamant');
  });

  it('should successfully create and claim pokemon eggs once save data has been migrated to canonical nature IDs', () => {
    // Simulating Angianemar's egg before migration (corrupted with 'Serio')
    const unmigratedEgg = {
      species: requirePokemonSpeciesId('bulbasaur'),
      nature: 'Serio' as unknown as string,
      steps: 1000,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      movesAtBirth: [],
      abilitySlot: 0,
      isShiny: false
    };

    // Demonstrating that unmigrated egg fails legitimately
    expect(() => {
      eggFactory.createPokemonEgg({
        species: unmigratedEgg.species,
        nature: unmigratedEgg.nature as any,
        steps: unmigratedEgg.steps,
        ivs: unmigratedEgg.ivs,
        movesAtBirth: unmigratedEgg.movesAtBirth,
        abilitySlot: unmigratedEgg.abilitySlot,
        isShiny: unmigratedEgg.isShiny
      });
    }).toThrow("[natures] Invalid NatureId: 'Serio'");

    // Simulating post-migration state: 'Serio' -> 'serious'
    const migratedNature = 'serious';
    expect(isNatureId(migratedNature)).toBe(true);

    const egg = eggFactory.createPokemonEgg({
      species: unmigratedEgg.species,
      nature: toNatureId(migratedNature),
      steps: unmigratedEgg.steps,
      ivs: unmigratedEgg.ivs,
      movesAtBirth: unmigratedEgg.movesAtBirth,
      abilitySlot: unmigratedEgg.abilitySlot,
      isShiny: unmigratedEgg.isShiny
    });

    expect(egg.uid).toBeDefined();
    expect(egg.nature).toBe('serious');
    expect(egg.id).toBe('bulbasaur');
  });
});
