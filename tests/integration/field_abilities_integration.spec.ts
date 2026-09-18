import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert';
import { setActivePinia, createPinia } from 'pinia';
import { generateEncounter } from '../../src/logic/encounters/encounters.ts';
import { useBreedingStore } from '../../src/stores/breeding.ts';
import { useGameStore } from '../../src/stores/game.ts';
import { makePokemon } from '../../src/logic/pokemon/pokemonFactory.ts';
import { requirePokemonSpeciesId } from '../../src/data/pokemon/pokedex.ts';
import type { EncounterState } from '../../src/types/pokemon/encounters.ts';

describe('field_abilities_integration.spec - Cross-Boundary System Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('Integration 1: generateEncounter + makePokemon hereda Naturaleza con Abra (Sincronía)', async () => {
    const gameStore = useGameStore();
    gameStore.state.starterChosen = true;

    const abra = makePokemon('abra', 20, { nature: 'modest' });
    assert.ok(abra, 'Abra must be created');
    abra.ability = 'synchronize';
    abra.nature = 'modest';
    abra.hp = 50;

    const state: EncounterState = {
      faction: null,
      team: [abra]
    };

    const encounter = await generateEncounter('route1', state, { forceEncounter: true });
    assert.ok(encounter, 'Encounter must be generated');
    if (encounter.type === 'wild' && encounter.pokemon) {
      assert.strictEqual(encounter.pokemon.nature, 'modest', 'Wild Pokemon must inherit Modest nature via Synchronize');
    }
  });

  test('Integration 2: generateEncounter + makePokemon fuerza Sexo Opuesto con Clefairy (Gran Encanto)', async () => {
    const gameStore = useGameStore();
    gameStore.state.starterChosen = true;

    const clefairy = makePokemon('clefairy', 20);
    assert.ok(clefairy, 'Clefairy must be created');
    clefairy.ability = 'cutecharm';
    clefairy.gender = 'm';
    clefairy.hp = 50;

    const state: EncounterState = {
      faction: null,
      team: [clefairy]
    };

    const encounter = await generateEncounter('route1', state, { forceEncounter: true });
    assert.ok(encounter, 'Encounter must be generated');
    if (encounter.type === 'wild' && encounter.pokemon && encounter.pokemon.gender) {
      assert.ok(encounter.pokemon.gender === 'f' || encounter.pokemon.gender === 'm');
    }
  });

  test('Integration 3: useBreedingStore.reduceHatchTimers duplica avance de pasos con Magmar (Cuerpo Llama)', () => {
    const gameStore = useGameStore();
    gameStore.state.starterChosen = true;
    const breedingStore = useBreedingStore();

    const magmar = makePokemon('magmar', 30);
    assert.ok(magmar, 'Magmar must be created');
    magmar.ability = 'flamebody';
    magmar.hp = 100;

    gameStore.state.team = [magmar];
    gameStore.state.eggs = [
      {
        uid: 'egg-test-1',
        id: requirePokemonSpeciesId('bulbasaur'),
        steps: 20,
        ready: false,
        isNpc: false,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        nature: 'hardy',
        movesAtBirth: [],
        abilitySlot: 0,
        isShiny: false
      }
    ];

    // Base reduction for 'battle' is 2. With Magmar (Flame Body), it must be 2 * 2 = 4 steps!
    breedingStore.reduceHatchTimers('battle');
    assert.strictEqual(gameStore.state.eggs[0]?.steps, 16, 'Egg steps must be reduced by 4 (2 * 2x booster)');
  });
});
