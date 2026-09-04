import { describe, it, expect } from 'vitest';
import { SHOP_ITEMS, ITEMS_BY_ID, getItemById, isItemId } from '@/data/inventory/items';
import { FIRE_RED_MAPS, MAPS_BY_ROUTE_ID, getMapLocationById } from '@/data/world/maps';
import {
  isLegendaryPokemonSpeciesId,
  isBabyPokemonSpeciesId,
  isFossilPokemonSpeciesId,
  getPokedexOrderIndex,
  GAME_TMS_BY_ID
} from '@/data/pokemon/pokedex';
import { GYMS, GYMS_BY_ID, getGymById, isGymId } from '@/data/world/gyms';

describe('Static Catalogs O(1) Lookups & Domain Contracts', () => {
  describe('Items Catalog (ITEMS_BY_ID & getItemById)', () => {
    it('should have 100% item parity between SHOP_ITEMS array and ITEMS_BY_ID record', () => {
      expect(Object.keys(ITEMS_BY_ID).length).toBe(SHOP_ITEMS.length);
      for (const item of SHOP_ITEMS) {
        expect(ITEMS_BY_ID[item.id]).toBe(item);
        expect(getItemById(item.id)).toBe(item);
      }
    });

    it('should validate item IDs in O(1) via isItemId', () => {
      expect(isItemId('potion')).toBe(true);
      expect(isItemId('masterball')).toBe(true);
      expect(isItemId('non_existent_item_xyz')).toBe(false);
    });

    it('should throw explicit error when getItemById receives an invalid item id', () => {
      expect(() => getItemById('non_existent_item_xyz')).toThrow();
    });
  });

  describe('Maps Catalog (MAPS_BY_ROUTE_ID & getMapLocationById)', () => {
    it('should have 100% parity between FIRE_RED_MAPS and MAPS_BY_ROUTE_ID', () => {
      expect(Object.keys(MAPS_BY_ROUTE_ID).length).toBe(FIRE_RED_MAPS.length);
      for (const map of FIRE_RED_MAPS) {
        expect(MAPS_BY_ROUTE_ID[map.id]).toBe(map);
        expect(getMapLocationById(map.id)).toBe(map);
      }
    });

    it('should throw explicit error for invalid route IDs', () => {
      expect(() => getMapLocationById('fake_route_999' as unknown as import('@/data/world/map-assets').MapRouteId)).toThrow();
    });
  });

  describe('Pokedex Classifications & Order Index (O(1) Set / Record lookups)', () => {
    it('should correctly identify legendary species in O(1)', () => {
      expect(isLegendaryPokemonSpeciesId('mewtwo')).toBe(true);
      expect(isLegendaryPokemonSpeciesId('articuno')).toBe(true);
      expect(isLegendaryPokemonSpeciesId('pidgey')).toBe(false);
    });

    it('should correctly identify baby species in O(1)', () => {
      expect(isBabyPokemonSpeciesId('pichu')).toBe(true);
      expect(isBabyPokemonSpeciesId('cleffa')).toBe(true);
      expect(isBabyPokemonSpeciesId('pikachu')).toBe(false);
    });

    it('should correctly identify fossil species in O(1)', () => {
      expect(isFossilPokemonSpeciesId('omanyte')).toBe(true);
      expect(isFossilPokemonSpeciesId('kabuto')).toBe(true);
      expect(isFossilPokemonSpeciesId('charizard')).toBe(false);
    });

    it('should resolve Pokedex order index in O(1)', () => {
      expect(getPokedexOrderIndex('bulbasaur')).toBe(0);
      expect(getPokedexOrderIndex('ivysaur')).toBe(1);
      expect(getPokedexOrderIndex('mew')).toBe(150);
      expect(getPokedexOrderIndex('chikorita')).toBe(151);
      expect(getPokedexOrderIndex('non_existent_species' as unknown as import('@/data/pokemon/pokedex').PokemonSpeciesId)).toBe(-1);
    });

    it('should index all GAME_TMS in GAME_TMS_BY_ID in O(1)', () => {
      expect(GAME_TMS_BY_ID['TM01']).toBeDefined();
      expect(GAME_TMS_BY_ID['TM01'].id).toBe('TM01');
    });
  });

  describe('Gyms Catalog (GYMS_BY_ID & getGymById)', () => {
    it('should have 100% parity between GYMS and GYMS_BY_ID', () => {
      expect(Object.keys(GYMS_BY_ID).length).toBe(GYMS.length);
      for (const gym of GYMS) {
        expect(GYMS_BY_ID[gym.id]).toBe(gym);
        expect(getGymById(gym.id)).toBe(gym);
      }
    });

    it('should validate gym IDs in O(1) and throw on missing gym', () => {
      expect(isGymId('pewter')).toBe(true);
      expect(isGymId('cerulean')).toBe(true);
      expect(isGymId('fake_gym')).toBe(false);
      expect(() => getGymById('fake_gym' as unknown as import('@/data/world/gyms').GymId)).toThrow();
    });
  });
});
