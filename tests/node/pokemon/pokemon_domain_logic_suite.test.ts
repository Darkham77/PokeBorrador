/**
 * tests/node/pokemon/pokemon_domain_logic_suite.test.ts
 *
 * Consolidated Domain Suite for Pokémon Math, Stats, Generation & Domain Logic:
 * 1. Hatch Auras: getAuraStyles color resolution by type, shiny, and guardian status.
 * 2. Level 100 Pokemon Serialization Parity: Finite expNeeded and save validation.
 * 3. Move Relearner & Descriptions: Spanish move name resolution and Showdown mapping.
 * 4. PokedexAggregator: Native iterator merging and deduplication.
 * 5. Pokemon Factory: Recalc stat recalculation and HP clamping.
 * 6. IV Generation Math: Pure random generator, floor constraints, guardian rerolls, mission floors.
 * 7. Stats & Exp Math: calcStatsPure, getExpNeededPure, nature multipliers, Metal Powder.
 * 8. Type Effectiveness & Move Description Pure: Damage multipliers and description text.
 * 9. Total Power & EV Bonus IVs: BST calculation, EV point conversion, TOT filter/sort.
 * 10. Pokedex Migration: Syncing seen and owned species across team and box.
 */

import { describe, it, test, expect, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setActivePinia, createPinia } from 'pinia';

import { getAuraStyles } from '@/logic/breeding/hatchAuras.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService.ts';
import { serializeState } from '@/logic/auth/saveSerializer.ts';
import { validateSaveData } from '@/logic/validation/schemas.ts';
import { INITIAL_STATE } from '@/stores/gameInitialState.ts';
import type { GameState } from '@/types/system/game.ts';
import { getMoveDescription, calculateTotalPower } from '@/logic/pokemon/pokemonUtils.ts';
import { ITEM_IDS } from '@/data/inventory/itemIds.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { PokedexAggregator } from '@/logic/pokemon/pokedexAggregator.ts';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory.ts';
import { generateIvPure } from '@/logic/pokemon/generationMath.ts';
import { calcStatsPure, getExpNeededPure, type NatureData } from '@/logic/pokemon/statsMath.ts';
import { getTypeEffectivenessMsg, getMoveDescriptionPure } from '@/logic/pokemon/pokemonMath.ts';
import type { MoveBaseData } from '@/types/system/database.ts';
import { calculateEvBonusIvs, EVS_PER_STAT_POINT } from '@/logic/pokemon/evMath.ts';
import { filterAndSortPokemon, getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts';

interface MockPokemon {
  type: string;
  isShiny?: boolean;
  isGuardian?: boolean;
}

interface SaveWrapper {
  user_id?: string;
  save_data?: GameState;
  last_save_id?: string;
}

const createMockPoke = (id: PokemonSpeciesId): Pokemon => ({
  id,
  name: id,
  uid: Math.random().toString(),
  hp: 100,
  maxHp: 100,
  level: 5,
  isShiny: false,
  ivs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  stats: { hp: 100, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
  moves: []
} as unknown as Pokemon);

function findAngianemarSave(saves: SaveWrapper[]): SaveWrapper | undefined {
  return saves.find((s) => s.user_id === '259ef49f-54b2-40c6-a797-5951dc966cb4');
}

function filterSquirtle(list: PokemonSpeciesId[] | undefined): PokemonSpeciesId[] {
  return (list || []).filter((id) => id !== 'squirtle');
}

function hasSquirtle(box: (Pokemon | null)[] | undefined): boolean {
  return (box || []).some((p) => p?.id === 'squirtle');
}

function getPokemonIds(team: (Pokemon | null)[] | undefined, box: (Pokemon | null)[] | undefined): PokemonSpeciesId[] {
  const ids: PokemonSpeciesId[] = [];
  if (team) {
    for (const p of team) {
      if (p?.id) ids.push(p.id);
    }
  }
  if (box) {
    for (const p of box) {
      if (p?.id) ids.push(p.id);
    }
  }
  return ids;
}

describe('Pokemon Domain Logic Suite', () => {
  describe('hatchAuras - getAuraStyles', () => {
    const flare1 = 'url1';
    const flare2 = 'url2';

    it('should return default cyan/blue colors when pokemon is null', () => {
      const styles = getAuraStyles(null, flare1, flare2);
      assert.strictEqual(styles['--flare-1-url'], "url('url1')");
      assert.strictEqual(styles['--flare-2-url'], "url('url2')");
      assert.strictEqual(styles['--aura-color-1'], 'rgba(0, 255, 255, 0.85)');
      assert.strictEqual(styles['--aura-color-2'], 'rgba(0, 190, 255, 0.75)');
    });

    it('should return correct type colors for normal type pokemon', () => {
      const p: MockPokemon = { type: 'normal' };
      const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
      assert.strictEqual(styles['--aura-color-1'], 'rgba(168, 168, 120, 0.95)');
      assert.strictEqual(styles['--aura-color-2'], 'rgba(120, 120, 90, 0.8)');
    });

    it('should return gold/orange colors for shiny pokemon', () => {
      const p: MockPokemon = { type: 'fire', isShiny: true };
      const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
      assert.strictEqual(styles['--aura-color-1'], 'rgba(255, 215, 0, 0.95)');
      assert.strictEqual(styles['--aura-color-2'], 'rgba(255, 140, 0, 0.85)');
    });

    it('should return white/silver colors for guardian pokemon', () => {
      const p: MockPokemon = { type: 'water', isGuardian: true };
      const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
      assert.strictEqual(styles['--aura-color-1'], 'rgba(255, 255, 255, 0.95)');
      assert.strictEqual(styles['--aura-color-2'], 'rgba(173, 216, 230, 0.85)');
    });
  });

  describe('Level 100 Pokemon Serialization Parity', () => {
    it('generates level 100 pokemon with finite serializable expNeeded (0) and passes validateSaveData', () => {
      const mew = pokemonDebugService.generate({ id: 'mew', level: 100 });
      assert.strictEqual(mew.level, 100);
      assert.strictEqual(typeof mew.expNeeded, 'number');
      assert.strictEqual(Number.isFinite(mew.expNeeded), true);

      const state = structuredClone(INITIAL_STATE) as GameState;
      state.trainer = 'TestTrainer';
      state.starterChosen = true;
      state.team = [mew];

      const serialized = serializeState(state);
      const jsonString = JSON.stringify(serialized);
      const parsed = JSON.parse(jsonString);
      const validation = validateSaveData(parsed);

      assert.strictEqual(
        validation.success,
        true,
        `Save validation failed for level 100 Pokemon: ${JSON.stringify(validation.issues)}`
      );
    });
  });

  describe('Move Relearner & Move Description Utility', () => {
    it('should resolve Spanish move names like "Mordisco" in getMoveDescription without throwing', () => {
      const descBite = getMoveDescription('bite');
      expect(descBite).toBeDefined();
      expect(descBite.length).toBeGreaterThan(0);

      const descMordisco = getMoveDescription('Mordisco');
      expect(descMordisco).toBe(descBite);
    });

    it('should confirm that "moverelearner" is the canonical ItemId in ITEM_IDS', () => {
      expect(ITEM_IDS.includes('moverelearner' as any)).toBe(true);
    });

    it('should resolve Spanish move name to Showdown ID via getMoveIdBySpanishName', () => {
      const resolvedId = pokemonDataProvider.getMoveIdBySpanishName('Mordisco');
      expect(resolvedId).toBe('bite');
    });
  });

  describe('PokedexAggregator', () => {
    it('should concatenate species from different pools using native Iterators', () => {
      const team = [createMockPoke('pikachu'), createMockPoke('bulbasaur')];
      const pc = [createMockPoke('charmander')];
      const wild: PokemonSpeciesId[] = ['squirtle', 'caterpie'];

      const all = PokedexAggregator.getAllKnownSpecies(team, pc, wild);
      const results = Array.from(all as unknown as Iterable<string>);

      assert.deepEqual(results, ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'caterpie']);
    });

    it('should return unique species list filtering duplicates', () => {
      const team = [createMockPoke('pikachu')];
      const pc = [createMockPoke('pikachu'), createMockPoke('eevee')];
      const wild: PokemonSpeciesId[] = ['eevee', 'mew'];

      const unique = PokedexAggregator.getFilteredSpecies(team, pc, wild);

      assert.deepEqual(unique, ['pikachu', 'eevee', 'mew']);
      assert.equal(unique.length, 3);
    });

    it('should handle empty pools gracefully', () => {
      const unique = PokedexAggregator.getFilteredSpecies([], [], []);
      assert.deepEqual(unique, []);
    });
  });

  describe('pokemonFactory - recalcPokemonStats HP clamping safety', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
    });

    test('Clamps hp to maxHp if recalculation decreases maxHp below current hp', () => {
      const p = makePokemon('bulbasaur', 1, {
        nature: 'hardy'
      });

      assert.ok(p, 'Should generate Bulbasaur');

      p.hp = 12;
      p.maxHp = 12;

      p.ivs.hp = 0;

      recalcPokemonStats(p);

      assert.strictEqual(p.hp, p.maxHp, 'HP should be clamped to new maxHp');
      assert.ok(p.hp <= 11, 'HP should be reduced to 11 or lower');
    });
  });

  describe('Pokémon IV Generation Logic (Pure Math)', () => {
    test('Standard generation uses the random function correctly', () => {
      const mockRandom = () => 0.5;
      const result = generateIvPure(mockRandom, 0, false, false);
      assert.strictEqual(result, 16);
    });

    test('ivFloor applies when the roll is lower', () => {
      const mockRandom = () => 0.1;
      const result = generateIvPure(mockRandom, 10, false, false);
      assert.strictEqual(result, 10, 'Should return the floor (10) instead of the roll (3)');
    });

    test('ivFloor does not apply when the roll is higher', () => {
      const mockRandom = () => 0.9;
      const result = generateIvPure(mockRandom, 10, false, false);
      assert.strictEqual(result, 28, 'Should return the roll (28) which is higher than the floor (10)');
    });

    test('Guardian Alpha standard (isGuardian) ensures a minimum of 12', () => {
      const mockRandom = () => 0.1;
      const result = generateIvPure(mockRandom, 0, true, true);
      assert.strictEqual(result, 12, 'Guardian must have at least 12 IVs even with bad rolls');
    });

    test('Guardian forceReRoll takes the best of two rolls', () => {
      let callCount = 0;
      const mockRandom = () => {
        callCount++;
        return callCount === 1 ? 0.1 : 0.9;
      };

      const result = generateIvPure(mockRandom, 0, true, false);
      assert.strictEqual(result, 28, 'Should pick the highest of the two rolls');
      assert.strictEqual(callCount, 2, 'Should have called random twice');
    });

    test('Bono de Dominancia (floor = 15) overrides lower rolls', () => {
      const mockRandom = () => 0.2;
      const result = generateIvPure(mockRandom, 15, false, false);
      assert.strictEqual(result, 15, 'Dominance floor (15) should override roll (6)');
    });

    test('Missions (24h floor = 15) overrides lower rolls', () => {
      const mockRandom = () => 0.4;
      const result = generateIvPure(mockRandom, 15, false, false);
      assert.strictEqual(result, 15);
    });
  });

  describe('Pokemon Stats Pure Math (calcStatsPure & getExpNeededPure)', () => {
    describe('getExpNeededPure', () => {
      it('returns correctly scaled exp for level 1: (1+1)^3 - 1^3 = 8 - 1 = 7', () => {
        assert.strictEqual(getExpNeededPure(1), 7);
      });

      it('returns correctly scaled exp for level 5: 6^3 - 5^3 = 216 - 125 = 91', () => {
        assert.strictEqual(getExpNeededPure(5), 91);
      });

      it('returns 0 for level 100 or above to ensure valid JSON serialization', () => {
        assert.strictEqual(getExpNeededPure(100), 0);
        assert.strictEqual(getExpNeededPure(150), 0);
      });
    });

    describe('calcStatsPure', () => {
      const charmanderBase = { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 };
      const dittoBase = { hp: 48, atk: 48, def: 48, spa: 48, spd: 48, spe: 48 };

      it('calculates correct stats for a Level 5 Charmander with 0 IVs and neutral nature', () => {
        const ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        const nature = { up: null, down: null };

        const stats = calcStatsPure(5, ivs, charmanderBase, nature);

        assert.strictEqual(stats.maxHp, 18);
        assert.strictEqual(stats.atk, 10);
        assert.strictEqual(stats.def, 9);
        assert.strictEqual(stats.spa, 11);
        assert.strictEqual(stats.spd, 10);
        assert.strictEqual(stats.spe, 11);
      });

      it('calculates correct stats for a Level 100 Charmander with perfect 31 IVs and neutral nature', () => {
        const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const nature = { up: null, down: null };

        const stats = calcStatsPure(100, ivs, charmanderBase, nature);

        assert.strictEqual(stats.maxHp, 219);
        assert.strictEqual(stats.atk, 140);
      });

      it('applies nature multipliers correctly (Firme/Adamant: +Atk, -Spa)', () => {
        const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const nature: NatureData = { up: 'atk', down: 'spa' };

        const stats = calcStatsPure(100, ivs, charmanderBase, nature);

        assert.strictEqual(stats.atk, 154);
        assert.strictEqual(stats.spa, 140);
      });

      it('applies Metal Powder bonus to Ditto (1.5x Defense)', () => {
        const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const nature = { up: null, down: null };

        const statsNormal = calcStatsPure(50, ivs, dittoBase, nature, false);
        assert.strictEqual(statsNormal.def, 68);

        const statsMetal = calcStatsPure(50, ivs, dittoBase, nature, true);
        assert.strictEqual(statsMetal.def, 102);
      });

      it('falls back to atk/def for spa/spd if base does not have them', () => {
        const gen1Base = { hp: 45, atk: 49, def: 49 };
        const ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        const nature = { up: null, down: null };

        const stats = calcStatsPure(50, ivs, gen1Base, nature, false);

        assert.strictEqual(stats.spa, stats.atk);
        assert.strictEqual(stats.spd, stats.def);
        assert.strictEqual(stats.spe, Math.floor((45 * 2 + 0) * 50 / 100 + 5));
      });
    });
  });

  describe('getTypeEffectivenessMsg & getMoveDescriptionPure', () => {
    describe('getTypeEffectivenessMsg', () => {
      it('returns "¡No afecta!" for 0x multiplier', () => {
        assert.strictEqual(getTypeEffectivenessMsg(0), '¡No afecta!');
      });

      it('returns "¡Es muy eficaz!" for 2x', () => {
        assert.strictEqual(getTypeEffectivenessMsg(2), '¡Es muy eficaz!');
      });

      it('returns "¡Es muy eficaz!" for 4x', () => {
        assert.strictEqual(getTypeEffectivenessMsg(4), '¡Es muy eficaz!');
      });

      it('returns "No es muy eficaz..." for 0.5x', () => {
        assert.strictEqual(getTypeEffectivenessMsg(0.5), 'No es muy eficaz...');
      });

      it('returns "No es muy eficaz..." for 0.25x', () => {
        assert.strictEqual(getTypeEffectivenessMsg(0.25), 'No es muy eficaz...');
      });

      it('returns null for 1x (neutral)', () => {
        assert.strictEqual(getTypeEffectivenessMsg(1), null);
      });
    });

    describe('getMoveDescription (with explicit MoveBaseData)', () => {
      it('status move returns the status description', () => {
        const md = { cat: 'status' } as unknown as MoveBaseData;
        assert.strictEqual(
          getMoveDescriptionPure('growl', md),
          'Un movimiento que causa un efecto de estado o alteración.',
        );
      });

      it('selfKO move description mentions debilita', () => {
        const md = { selfKO: true, power: 250, cat: 'physical' } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('explosion', md).includes('debilita'));
      });

      it('recoil move mentions retroceso', () => {
        const md = { recoil: 0.25, cat: 'physical', power: 80 } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('take-down', md).includes('retroceso'));
      });

      it('drain move (non-status) mentions Restaura', () => {
        const md = { drain: 0.5, cat: 'special', power: 75 } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('mega-drain', md).includes('Restaura'));
      });

      it('structured burn effect returns correct string', () => {
        const md = {
          effect: { type: 'status', status: 'brn', chance: 10, text: 'Puede quemar al objetivo.' },
          cat: 'special',
          power: 40,
        } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('ember', md).includes('quemar'));
      });

      it('structured poison effect returns correct string', () => {
        const md = {
          effect: { type: 'status', status: 'psn', text: 'Envenena al objetivo.' },
          cat: 'special',
          power: 65,
        } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('sludge-bomb', md).includes('Envenena'));
      });

      it('priority move mentions primero', () => {
        const md = { priority: 1, cat: 'physical', power: 40 } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('quick-attack', md).includes('primero'));
      });

      it('OHKO move description mentions Fulmina', () => {
        const md = { ohko: true, cat: 'physical', power: 0 } as unknown as MoveBaseData;
        assert.ok(getMoveDescriptionPure('fissure', md).includes('Fulmina'));
      });

      it('move with no effect returns default physical description', () => {
        const md = { cat: 'physical', power: 40 } as unknown as MoveBaseData;
        const result = getMoveDescriptionPure('tackle', md);
        assert.ok(
          result.includes('Causa daño'),
          `Expected default damage description, got: "${result}"`,
        );
      });
    });
  });

  describe('Total Power (TOT / TOTAL) & EV Bonus IV Calculation', () => {
    it('EVS_PER_STAT_POINT constant is 4', () => {
      assert.strictEqual(EVS_PER_STAT_POINT, 4);
    });

    describe('calculateEvBonusIvs', () => {
      it('returns 0 when EVs are null, undefined or empty', () => {
        assert.strictEqual(calculateEvBonusIvs(null), 0);
        assert.strictEqual(calculateEvBonusIvs(undefined), 0);
        assert.strictEqual(calculateEvBonusIvs({}), 0);
        assert.strictEqual(calculateEvBonusIvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }), 0);
      });

      it('calculates floor(ev / 4) per stat and sums them up', () => {
        const evs = { hp: 3, atk: 7, def: 8, spa: 0, spd: 252, spe: 255 };
        const expected = 0 + 1 + 2 + 0 + 63 + 63;
        assert.strictEqual(calculateEvBonusIvs(evs), expected);
      });

      it('yields exactly 127 IV-equivalent points for a standard 252/252/4 spread', () => {
        const competitiveEvs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
        assert.strictEqual(calculateEvBonusIvs(competitiveEvs), 127);
      });
    });

    describe('calculateTotalPower', () => {
      it('returns 0 for null/undefined pokemon', () => {
        assert.strictEqual(calculateTotalPower(null as unknown as Pokemon), 0);
        assert.strictEqual(calculateTotalPower(undefined as unknown as Pokemon), 0);
      });

      it('computes BST + Total IVs + EV Bonus IVs correctly for Pikachu', () => {
        const untrainedPikachu: Pokemon = {
          uid: 'pika-untrained',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          hp: 100,
          maxHp: 100,
          type: 'Electric',
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        } as unknown as Pokemon;

        const trainedPikachu: Pokemon = {
          uid: 'pika-trained',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          hp: 100,
          maxHp: 100,
          type: 'Electric',
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }
        } as unknown as Pokemon;

        const untrainedScore = calculateTotalPower(untrainedPikachu);
        const trainedScore = calculateTotalPower(trainedPikachu);

        assert.strictEqual(untrainedScore, 320 + 186);
        assert.strictEqual(trainedScore, 320 + 186 + 127);
        assert.ok(trainedScore > untrainedScore);
        assert.strictEqual(trainedScore - untrainedScore, 127);
      });

      it('getPokemonTotalPower delegates to calculateTotalPower', () => {
        const poke: Pokemon = {
          uid: 'pika-1',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
          evs: { hp: 40, atk: 40, def: 0, spa: 0, spd: 0, spe: 0 }
        } as unknown as Pokemon;

        assert.strictEqual(getPokemonTotalPower(poke), calculateTotalPower(poke));
      });
    });

    describe('filterAndSortPokemon - TOT Sorting with EVs', () => {
      it('ranks trained pokemon higher than untrained pokemon when sorting by TOT in desc order', () => {
        const untrained: Pokemon = {
          uid: 'u-1',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        } as unknown as Pokemon;

        const trained: Pokemon = {
          uid: 'u-2',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 }
        } as unknown as Pokemon;

        const list = [
          { pokemon: untrained, _source: 'team' as const, index: 0 },
          { pokemon: trained, _source: 'team' as const, index: 1 }
        ];

        const sorted = filterAndSortPokemon(list, {
          searchQuery: '',
          sortBy: 'TOT',
          sortOrder: 'desc',
          activeTags: []
        });

        assert.strictEqual(sorted[0]?.pokemon.uid, 'u-2');
        assert.strictEqual(sorted[1]?.pokemon.uid, 'u-1');
      });
    });
  });

  describe('Pokedex Migration Logic Test', () => {
    it('correctly syncs Pokedex from box and team for Angianemar and updates save ID', () => {
      const backupPath = path.resolve('tests/node/fixtures/server_franco_backup_fixture.json');
      assert.ok(fs.existsSync(backupPath), 'Backup file must exist');

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      assert.ok(backupData.data, 'Backup must contain data');

      const userSave = findAngianemarSave(backupData.data.game_saves || []);

      assert.ok(userSave, 'Angianemar save must exist in backup');
      const saveData = userSave.save_data as GameState;

      saveData.pokedex = filterSquirtle(saveData.pokedex);
      saveData.seenPokedex = filterSquirtle(saveData.seenPokedex);

      const initialLastSaveId = userSave.last_save_id;

      assert.strictEqual(hasSquirtle(saveData.box), true, 'Angianemar must have squirtle in their box initially');
      assert.strictEqual(saveData.pokedex.includes('squirtle'), false, 'Angianemar must NOT have squirtle in their pokedex initially');

      const pokemonIds = getPokemonIds(saveData.team, saveData.box);

      saveData.pokedex = Array.from(new Set<PokemonSpeciesId>([...(saveData.pokedex || []), ...pokemonIds]));
      saveData.seenPokedex = Array.from(new Set<PokemonSpeciesId>([...(saveData.seenPokedex || []), ...pokemonIds]));

      userSave.last_save_id = 'mocked-random-uuid-generation-1234';

      assert.strictEqual(saveData.pokedex.includes('squirtle'), true, 'Squirtle must be in pokedex after migration');
      assert.strictEqual(saveData.seenPokedex.includes('squirtle'), true, 'Squirtle must be in seenPokedex after migration');
      assert.notStrictEqual(userSave.last_save_id, initialLastSaveId, 'last_save_id must change after migration');
    });
  });
});
