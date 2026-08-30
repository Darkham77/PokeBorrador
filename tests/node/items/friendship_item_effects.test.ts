/**
 * tests/node/items/friendship_item_effects.test.ts
 *
 * Tier 2 Integration Tests for consumable item effects on Pokemon friendship and Soothe Bell bonuses.
 */
import { describe, test, expect } from 'vitest';
import { handleEvBerry, handleVitamin, handleFeather } from '../../../src/logic/items/itemEffectHandlers.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function createMockPokemon(partial: Partial<Pokemon>): Pokemon {
  return {
    uid: 'item-test-uid',
    id: 'pikachu',
    name: 'Pikachu',
    species: 'pikachu',
    level: 25,
    exp: 100,
    expNeeded: 200,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    type: 'electric',
    status: '',
    isShiny: false,
    moves: [{ id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15, type: 'electric' }],
    ability: 'static',
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    evs: { hp: 40, atk: 40, def: 40, spa: 40, spd: 40, spe: 40 },
    nature: 'hardy',
    friendship: 70,
    ...partial,
  } as Pokemon;
}

describe('Consumable Item Friendship Handlers', () => {
  describe('handleEvBerry (EV-reducing berries: Pomeg, Kelpsy, etc.)', () => {
    test('reduces EVs and increases friendship by +10 without Soothe Bell', () => {
      const p = createMockPokemon({ friendship: 70 });
      const res = handleEvBerry(p, 'hp', 'PS');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(80); // 70 + 10
      expect(p.evs?.hp).toBe(30); // 40 - 10
    });

    test('increases friendship by +15 (+50% bonus) when holding Soothe Bell', () => {
      const p = createMockPokemon({ friendship: 70, heldItem: 'soothebell' });
      const res = handleEvBerry(p, 'hp', 'PS');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(85); // 70 + 15
    });

    test('caps friendship at 255 maximum', () => {
      const p = createMockPokemon({ friendship: 250 });
      const res = handleEvBerry(p, 'hp', 'PS');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(255);
    });
  });

  describe('handleVitamin (Protein, Carbos, etc.)', () => {
    test('adds EVs and increases friendship by +5', () => {
      const p = createMockPokemon({ friendship: 70 });
      const res = handleVitamin(p, 'atk', 'Ataque');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(75); // 70 + 5
      expect(p.evs?.atk).toBe(50); // 40 + 10
    });

    test('increases friendship by +7 when holding Soothe Bell', () => {
      const p = createMockPokemon({ friendship: 70, heldItem: 'soothebell' });
      const res = handleVitamin(p, 'atk', 'Ataque');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(77); // 70 + 7
    });
  });

  describe('handleFeather', () => {
    test('adds EVs and increases friendship by +1', () => {
      const p = createMockPokemon({ friendship: 70 });
      const res = handleFeather(p, 'spe', 'Velocidad');
      expect(res.success).toBe(true);
      expect(p.friendship).toBe(71); // 70 + 1
      expect(p.evs?.spe).toBe(41); // 40 + 1
    });
  });
});
