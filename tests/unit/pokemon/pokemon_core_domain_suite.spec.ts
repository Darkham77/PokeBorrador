/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ref, nextTick, type Ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import path from 'node:path';
import { Dex } from '@pkmn/sim';

import { useBoxFilters } from '@/composables/pokemon/useBoxFilters';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { mockLocalStorage } from '../../helpers/debugSetup.ts';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { checkPokemonLegality, hasIllegalPokemon } from '@/logic/pokemon/pokemonLegality';
import { auditAndRepairSaveData } from '../../../scripts/maintenance/repair_account_legality.ts';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { assignGender, makePokemon } from '@/logic/pokemon/pokemonFactory';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';
import { calcStatsPure } from '@/logic/pokemon/statsMath';
import { getLegalSpeciesMoves, getMaxAllowedMoves } from '@/logic/pokemon/pokemonLearnset';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getTypeEffectivenessMsg } from '@/logic/pokemon/pokemonMath';
import { getMoveDescription, generateRandomIVs } from '@/logic/pokemon/pokemonUtils';
import type { MoveBaseData } from '@/types/system/database';
import { getPokemonTier, hasPerfectIV } from '@/logic/pokemon/tierEngine';

mockLocalStorage();
if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: (global as unknown as { localStorage: unknown }).localStorage,
    writable: true,
    configurable: true
  });
}

describe('Pokemon Core Domain Suite', () => {
  describe('useBoxFilters filtering', () => {
    const mockBox = ref([
      { id: 'pikachu', name: 'Pikachu', nickname: 'Sparky', level: 25 },
      { id: 'bulbasaur', name: 'Bulbasaur', nickname: null, level: 5 },
      { id: 'charmander', name: 'Charmander', nickname: 'Blaze 🔥', level: 10 }
    ]) as Ref<Pokemon[]>;

    let filtersObj: ReturnType<typeof useBoxFilters>;

    beforeEach(() => {
      filtersObj = useBoxFilters(mockBox);
      filtersObj.resetFilters();
    });

    it('should filter by species name', () => {
      filtersObj.filters.value.search = 'pika';
      const results = filtersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('pikachu');
    });

    it('should filter by nickname', () => {
      filtersObj.filters.value.search = 'sparky';
      const results = filtersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('pikachu');
    });

    it('should filter by emoji nickname', () => {
      filtersObj.filters.value.search = '🔥';
      const results = filtersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('charmander');
    });

    it('should be case-insensitive for nicknames', () => {
      filtersObj.filters.value.search = 'SPARKY';
      const results = filtersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('pikachu');
    });
  });

  describe('useBoxFilters storage persistence', () => {
    const mockBox = ref([
      { id: 'pikachu', name: 'Pikachu', level: 25, obtainedAt: 1000 },
      { id: 'bulbasaur', name: 'Bulbasaur', level: 5, obtainedAt: 2000 },
      { id: 'charmander', name: 'Charmander', level: 50, obtainedAt: 500 }
    ]) as Ref<Pokemon[]>;

    beforeEach(() => {
      localStorage.clear();
    });

    it('defaults to recent and desc if localStorage is empty', () => {
      const { sortMode, sortDirection } = useBoxFilters(mockBox);
      expect(sortMode.value).toBe('recent');
      expect(sortDirection.value).toBe('desc');
    });

    it('updates localStorage when sortMode or sortDirection changes', async () => {
      const { sortMode, sortDirection } = useBoxFilters(mockBox);
      sortMode.value = 'level';
      sortDirection.value = 'asc';
      await nextTick();

      expect(localStorage.getItem('box_sort_mode')).toBe('level');
      expect(localStorage.getItem('box_sort_direction')).toBe('asc');
    });

    it('re-initializes from localStorage on a new instance (simulating page reload)', () => {
      localStorage.setItem('box_sort_mode', 'level');
      localStorage.setItem('box_sort_direction', 'asc');

      const { sortMode, sortDirection, processedBoxList } = useBoxFilters(mockBox);
      expect(sortMode.value).toBe('level');
      expect(sortDirection.value).toBe('asc');

      const list = processedBoxList.value;
      expect(list[0]!.p!.name).toBe('Bulbasaur');
      expect(list[1]!.p!.name).toBe('Pikachu');
      expect(list[2]!.p!.name).toBe('Charmander');
    });
  });

  describe('useBoxFilters - Total Power (BST + IVs)', () => {
    const mockPowerBox = ref([
      { 
        id: 'pikachu', 
        name: 'Pikachu', 
        level: 25, 
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // Total IVs: 186, TOTAL: 320 + 186 = 506
      },
      { 
        id: 'bulbasaur', 
        name: 'Bulbasaur', 
        level: 5, 
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } // Total IVs: 0, TOTAL: 318 + 0 = 318
      }
    ]) as Ref<Pokemon[]>;

    let powerFiltersObj: ReturnType<typeof useBoxFilters>;

    beforeEach(() => {
      powerFiltersObj = useBoxFilters(mockPowerBox);
      powerFiltersObj.resetFilters();
    });

    it('should filter by TOTAL power range', () => {
      // Filter for > 500
      powerFiltersObj.filters.value.bstMin = 500;
      let results = powerFiltersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('pikachu');

      // Filter for < 400
      powerFiltersObj.filters.value.bstMin = 0;
      powerFiltersObj.filters.value.bstMax = 400;
      results = powerFiltersObj.processedBoxList.value;
      expect(results).toHaveLength(1);
      expect(results[0]!.p!.id).toBe('bulbasaur');
    });

    it('should sort by TOTAL power (BST + IVs)', () => {
      powerFiltersObj.sortMode.value = 'bst';
      powerFiltersObj.sortDirection.value = 'desc';
      const results = powerFiltersObj.processedBoxList.value;
      expect(results[0]!.p!.id).toBe('pikachu'); // 506
      expect(results[1]!.p!.id).toBe('bulbasaur'); // 318
    });
  });

  describe('Illegal Account Case - Ash Fixture Repair & Resilience Test', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
    });

    it('loads the extracted illegal Ash account case without crashing', () => {
      const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/illegal_account_ash_case.json');
      const rawData = fs.readFileSync(fixturePath, 'utf8');
      const saveData = JSON.parse(rawData) as SaveDataDto;

      const sanitized = validateAndSanitize(saveData);
      expect(sanitized.valid).toBe(true);
      expect(sanitized.data).toBeDefined();
    });

    it('identifies, purges disabled species, and fully repairs all illegal Pokémon across team and box from Ash account', () => {
      const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/illegal_account_ash_case.json');
      const rawData = fs.readFileSync(fixturePath, 'utf8');
      const saveData = JSON.parse(rawData) as SaveDataDto;

      const result = auditAndRepairSaveData(saveData, true);
      expect(result.modified).toBe(true);

      const team = (saveData.team || []) as (Pokemon | null)[];
      const box = (saveData.box || []) as (Pokemon | null)[];
      const remainingPokes = [...team, ...box].filter((p): p is Pokemon => p !== null && typeof p === 'object' && !!p.id);

      remainingPokes.forEach((p) => {
        expect(!p.isIllegal).toBe(true);
        expect(p.illegalReasons || []).toEqual([]);
        expect(p.level).toBeGreaterThanOrEqual(1);
        expect(p.level).toBeLessThanOrEqual(100);

        const finalCheck = checkPokemonLegality(p);
        expect(finalCheck.isLegal).toBe(true);
        expect(finalCheck.issues).toHaveLength(0);
      });

      expect(hasIllegalPokemon(team)).toBe(false);
      expect(hasIllegalPokemon(box)).toBe(false);
    });
  });

  describe('Pokémon Creation & Legality Tests', () => {
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
      
      expect(p.moves.length).toBe(4);
      expect(p.moves[0]?.id).toBe('shadowball');
      expect(p.moves[1]?.id).toBe('hypnosis');
      expect(p.moves[2]?.id).toBe('sludgebomb');
      expect(p.moves[3]?.id).toBe('psychic');

      expect(p.moves[0]?.name).toBeDefined();
      expect(p.moves[0]?.pp).toBeGreaterThan(0);
    });
  });

  describe('pokemonFactory gender assignment & validation', () => {
    it('assigns female gender "f" for 100% female species Ogerpon Hearthflame', () => {
      const gender = assignGender('ogerponhearthflame');
      expect(gender).toBe('f');
    });

    it('assigns female gender "f" for 100% female species Ogerpon Cornerstone and Wellspring', () => {
      expect(assignGender('ogerponcornerstone')).toBe('f');
      expect(assignGender('ogerponwellspring')).toBe('f');
    });

    it('assigns gender "f" when creating Ogerpon Hearthflame without specifying gender options', () => {
      const p = makePokemon('ogerponhearthflame', 50, { bypassWhitelist: true });
      expect(p).not.toBeNull();
      expect(p?.gender).toBe('f');
    });
  });

  describe('Pokémon Stats Parity', () => {
    it('should calculate identical stats for Blissey at level 100 with zero EVs and 31 IVs', () => {
      const speciesData = Dex.species.get('blissey');
      const baseStats = speciesData.baseStats;

      const natureData = { up: null, down: null };
      const level = 100;
      const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

      const calculated = calcStatsPure(
        level,
        ivs,
        {
          hp: baseStats.hp,
          atk: baseStats.atk,
          def: baseStats.def,
          spa: baseStats.spa,
          spd: baseStats.spd,
          spe: baseStats.spe
        },
        natureData,
        false,
        evs
      );

      expect(calculated.maxHp).toBe(651);
      expect(calculated.def).toBe(56);
      expect(calculated.atk).toBe(56);
    });
  });

  describe('pokemonLearnset - getLegalSpeciesMoves', () => {
    it('returns legal moves for a given species and level', () => {
      const pikachuMoves = getLegalSpeciesMoves('pikachu' as PokemonSpeciesId, 10);
      expect(pikachuMoves.length).toBeGreaterThan(0);
    });

    it('restricts moves based on level limit', () => {
      const lowLevel = getLegalSpeciesMoves('charmander' as PokemonSpeciesId, 1);
      const highLevel = getLegalSpeciesMoves('charmander' as PokemonSpeciesId, 100);
      expect(highLevel.length).toBeGreaterThanOrEqual(lowLevel.length);
    });

    it('calculates max allowed moves correctly', () => {
      const count = getMaxAllowedMoves('pikachu' as PokemonSpeciesId, 25);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(4);
    });

    it('returns empty array when speciesId is not provided', () => {
      expect(getLegalSpeciesMoves('' as PokemonSpeciesId)).toEqual([]);
    });
  });

  describe('Pokemon Utils Logic', () => {
    describe('getTypeEffectivenessMsg', () => {
      it('should return correct messages for multipliers', () => {
        expect(getTypeEffectivenessMsg(0)).toBe('¡No afecta!');
        expect(getTypeEffectivenessMsg(2)).toBe('¡Es muy eficaz!');
        expect(getTypeEffectivenessMsg(4)).toBe('¡Es muy eficaz!');
        expect(getTypeEffectivenessMsg(0.5)).toBe('No es muy eficaz...');
        expect(getTypeEffectivenessMsg(0.25)).toBe('No es muy eficaz...');
        expect(getTypeEffectivenessMsg(1)).toBe(null);
      });
    });

    describe('getMoveDescription', () => {
      it('should return specific messages for effects', () => {
        expect(getMoveDescription('explosion')).toContain('debilita');
        expect(() => getMoveDescription('non-existent')).toThrow();
      });
      
      it('should return default message for normal status move', () => {
        const mockStatusMove = { cat: 'status' } as unknown as MoveBaseData;
        expect(getMoveDescription('growl', mockStatusMove)).toBe('Un movimiento que causa un efecto de estado o alteración.');
      });
    });

    describe('generateRandomIVs', () => {
      it('should return random IVs between 0 and 31 for all stats', () => {
        const ivs = generateRandomIVs();
        expect(ivs).toBeDefined();
        const stats: (keyof typeof ivs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
        stats.forEach(stat => {
          expect(ivs[stat]).toBeGreaterThanOrEqual(0);
          expect(ivs[stat]).toBeLessThanOrEqual(31);
          expect(Number.isInteger(ivs[stat])).toBe(true);
        });
      });
    });
  });

  describe('Tier Engine', () => {
    it('should return F tier for null or empty pokemon', () => {
      const tier = getPokemonTier(null);
      expect(tier.tier).toBe('F');
      expect(tier.total).toBe(0);
    });

    it('should calculate S+ tier for perfect IVs (186 total)', () => {
      const pokemon = {
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
      };
      const tier = getPokemonTier(pokemon as Partial<Pokemon>);
      expect(tier.tier).toBe('S+');
      expect(tier.total).toBe(186);
    });

    it('should calculate S tier for high IVs (170 total)', () => {
      const pokemon = {
        ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 25, spe: 25 }
      };
      const tier = getPokemonTier(pokemon as Partial<Pokemon>);
      expect(tier.tier).toBe('S');
      expect(tier.total).toBe(170);
    });

    it('should calculate A tier for average-high IVs (150 total)', () => {
      const pokemon = {
        ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 }
      };
      const tier = getPokemonTier(pokemon as Partial<Pokemon>);
      expect(tier.tier).toBe('A');
      expect(tier.total).toBe(150);
    });

    it('should detect perfect IVs correctly', () => {
      expect(hasPerfectIV({ ivs: { hp: 31 } } as Partial<Pokemon>)).toBe(true);
      expect(hasPerfectIV({ ivs: { hp: 30, atk: 20 } } as Partial<Pokemon>)).toBe(false);
      expect(hasPerfectIV(null)).toBe(false);
    });
  });
});
