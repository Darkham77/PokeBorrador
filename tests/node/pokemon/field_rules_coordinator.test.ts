import { describe, test } from 'vitest';
import assert from 'node:assert';
import {
  resolveFieldEncounterModifiers,
  resolveFieldBreedingModifiers,
  resolveFieldBattleRewards
} from '../../../src/logic/rules/fieldRulesCoordinator.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { MapLocation } from '../../../src/types/pokemon/encounters.ts';

function createMockPokemon(partial: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'mock-uid-field-1',
    id: requirePokemonSpeciesId('abra'),
    species: requirePokemonSpeciesId('abra'),
    name: 'Abra',
    type: 'psychic',
    level: 25,
    hp: 50,
    maxHp: 50,
    atk: 20,
    def: 20,
    spa: 50,
    spd: 30,
    spe: 45,
    status: '',
    sleepTurns: 0,
    friendship: 70,
    vigor: 10,
    maxVigor: 10,
    heldItem: null,
    nickname: null,
    tags: [],
    obtainedAt: Date.now(),
    obtainedMethod: 'wild',
    isFloating: false,
    catchRate: 200,
    exp: 0,
    expNeeded: 1000,
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'modest',
    ability: 'synchronize',
    gender: 'm',
    isShiny: false,
    moves: [{ id: 'teleport', name: 'Teleport', pp: 20, maxPP: 20 }],
    ...partial
  };
}

const mockLocation: MapLocation = {
  id: 'route1' as any,
  name: 'Ruta 1',
  wild: { day: [requirePokemonSpeciesId('pidgey'), requirePokemonSpeciesId('rattata')] },
  rates: { day: [50, 50] },
  lv: [2, 5]
};

describe('fieldRulesCoordinator - Unified Modifiers Engine', () => {
  describe('Encounter Modifiers Coordination', () => {
    test('Coordina Sincronía, Ojo Compuesto, y Nivel Máximo en un único paso', () => {
      const leader = createMockPokemon({
        id: requirePokemonSpeciesId('abra'),
        ability: 'synchronize',
        nature: 'timid'
      });

      const modifiers = resolveFieldEncounterModifiers({
        team: [leader],
        mapId: 'route1',
        loc: mockLocation,
        weather: 'clear',
        generation: 9,
        randomFn: () => 0.1
      });

      assert.strictEqual(modifiers.natureOverride, 'timid');
      assert.strictEqual(modifiers.leaderAbility, 'synchronize');
      assert.strictEqual(modifiers.encounterRateMultiplier, 1.0);
    });

    test('Coordina atracción elemental y multiplicador de pesca con caña', () => {
      const leader = createMockPokemon({
        id: requirePokemonSpeciesId('magnemite'),
        ability: 'magnetpull'
      });

      const modifiers = resolveFieldEncounterModifiers({
        team: [leader],
        mapId: 'power_plant',
        loc: mockLocation,
        weather: 'clear',
        generation: 9,
        randomFn: () => 0.1
      });

      assert.strictEqual(modifiers.attractionType, 'steel');
    });
  });

  describe('Breeding Modifiers Coordination', () => {
    test('Coordina eclosión acelerada por Cuerpo Llama y Destiny Knot', () => {
      const team = [createMockPokemon({ ability: 'flamebody', hp: 50 })];
      const parentA = createMockPokemon({ heldItem: 'destinyknot' });
      const parentB = createMockPokemon({ heldItem: 'everstone', nature: 'adamant' });

      const modifiers = resolveFieldBreedingModifiers({
        team,
        parentA,
        parentB,
        playerClass: 'criador'
      });

      assert.strictEqual(modifiers.hatchSpeedMultiplier, 2, 'Flamebody must grant 2x');
      assert.strictEqual(modifiers.inheritedIvsCount, 5, 'Destiny knot must grant 5 IVs');
      assert.strictEqual(modifiers.natureFromItem, 'adamant', 'Everstone must pass nature');
    });
  });

  describe('Post-Battle Rewards Coordination', () => {
    test('Coordina tiradas independientes de Recogida, Recogemiel y Cura Natural', () => {
      const meowth = createMockPokemon({ name: 'Meowth', ability: 'pickup', level: 30, hp: 50 });
      const combee = createMockPokemon({ name: 'Combee', ability: 'honeygather', level: 40, hp: 50 });
      const chansey = createMockPokemon({ name: 'Chansey', ability: 'naturalcure', hp: 50, status: 'psn' });

      const rewards = resolveFieldBattleRewards({
        team: [meowth, combee, chansey],
        isWild: true,
        isTrainer: false,
        randomFn: () => 0.01
      });

      assert.strictEqual(rewards.pickupItems.length, 1);
      assert.strictEqual(rewards.pickupItems[0]?.item, 'superpotion');
      assert.strictEqual(rewards.honeyGathered.length, 1);
      assert.strictEqual(rewards.honeyGathered[0]?.item, 'combeehoney');
      assert.strictEqual(chansey.status, '', 'Chansey must be cured');
      assert.deepStrictEqual(rewards.curedMembers, ['Chansey']);
    });
  });
});
