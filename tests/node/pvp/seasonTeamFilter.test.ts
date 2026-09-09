import { describe, it, expect } from 'vitest';
import { evaluatePokemonForSeason, buildAutoRankedTeam } from '@/logic/pvp/seasonTeamFilter';
import { getSeasonalThemeForMonth } from '@/data/system/rankedData';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('seasonTeamFilter - Frontera Kanto & Johto', () => {
  const createTestPokemon = (overrides: Partial<Pokemon>): Pokemon => ({
    uid: 'test-uid-1',
    id: 'dragonite',
    species: 'dragonite',
    name: 'Dragonite',
    level: 50,
    type: 'dragon',
    type2: 'flying',
    hp: 100,
    maxHp: 100,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    moves: [],
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ...overrides
  } as unknown as Pokemon);

  const frontierRules = getSeasonalThemeForMonth(9); // September = Frontera Kanto & Johto

  it('rejects Pokemon whose level exceeds levelCap (50)', () => {
    const overLevelMon = createTestPokemon({
      name: 'Dragonite',
      species: 'dragonite',
      id: 'dragonite',
      level: 85
    });

    const result = evaluatePokemonForSeason(overLevelMon, frontierRules);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/nivel m[aá]ximo/i);
  });

  it('accepts Pokemon with level <= 50 from Kanto (Gen 1)', () => {
    const validMon = createTestPokemon({
      name: 'Dragonite',
      species: 'dragonite',
      id: 'dragonite',
      level: 50
    });

    const result = evaluatePokemonForSeason(validMon, frontierRules);
    expect(result.eligible).toBe(true);
  });

  it('accepts Pokemon from Johto (Gen 2, e.g. Togepi / Pichu)', () => {
    const johtoMon = createTestPokemon({
      name: 'Togepi',
      species: 'togepi',
      id: 'togepi',
      type: 'normal',
      type2: undefined,
      level: 30
    });

    const result = evaluatePokemonForSeason(johtoMon, frontierRules);
    expect(result.eligible).toBe(true);
  });

  it('rejects Pokemon from Gen 3+ (e.g. Castform)', () => {
    const gen3Mon = createTestPokemon({
      name: 'Castform',
      species: 'castform',
      id: 'castform',
      type: 'normal',
      type2: undefined,
      level: 40
    });

    const result = evaluatePokemonForSeason(gen3Mon, frontierRules);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Gen 3|Kanto.*Johto|regional|temporada/i);
  });

  it('buildAutoRankedTeam only includes eligible Pokemon (<= Lv 50 and Gen 1-2)', () => {
    const pool: Pokemon[] = [
      createTestPokemon({ uid: 'p1', id: 'dragonite', species: 'dragonite', name: 'Dragonite High', level: 85 }),
      createTestPokemon({ uid: 'p2', id: 'castform', species: 'castform', name: 'Castform Gen3', level: 30 }),
      createTestPokemon({ uid: 'p3', id: 'gengar', species: 'gengar', name: 'Gengar 50', level: 50 }),
      createTestPokemon({ uid: 'p4', id: 'togepi', species: 'togepi', name: 'Togepi 45', level: 45 }),
      createTestPokemon({ uid: 'p5', id: 'pikachu', species: 'pikachu', name: 'Pikachu 35', level: 35 }),
      createTestPokemon({ uid: 'p6', id: 'wartortle', species: 'wartortle', name: 'Wartortle 40', level: 40 }),
      createTestPokemon({ uid: 'p7', id: 'ninetales', species: 'ninetales', name: 'Ninetales 44', level: 44 }),
      createTestPokemon({ uid: 'p8', id: 'dratini', species: 'dratini', name: 'Dratini 26', level: 26 })
    ];

    const autoTeam = buildAutoRankedTeam(pool, frontierRules, 6);
    expect(autoTeam.length).toBe(6);
    // None should be Dragonite High (Lv 85) or Castform (Gen 3)
    const uids = autoTeam.map(p => p.uid);
    expect(uids).not.toContain('p1');
    expect(uids).not.toContain('p2');
    for (const p of autoTeam) {
      expect(p.level).toBeLessThanOrEqual(50);
    }
  });

  describe('Algorithm & Prioritization: (Level * 1000) + TOT IVs', () => {
    it('prioritizes higher level over higher IVs', () => {
      const lv50LowIv = createTestPokemon({
        uid: 'lv50',
        name: 'Lv 50 Low IV',
        level: 50,
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      });
      const lv49MaxIv = createTestPokemon({
        uid: 'lv49',
        name: 'Lv 49 Max IV',
        level: 49,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // TOT = 186
      });

      const team = buildAutoRankedTeam([lv49MaxIv, lv50LowIv], frontierRules, 1);
      expect(team).toHaveLength(1);
      // Level 50 (50 * 1000 + 0 = 50000) beats Level 49 (49 * 1000 + 186 = 49186)
      expect(team[0]?.uid).toBe('lv50');
    });

    it('breaks ties between equal levels using TOT (Total IVs)', () => {
      const lv50Iv100 = createTestPokemon({
        uid: 'mid-iv',
        name: 'Lv 50 Mid IV',
        level: 50,
        ivs: { hp: 16, atk: 16, def: 16, spa: 16, spd: 16, spe: 20 } // TOT = 100
      });
      const lv50Iv186 = createTestPokemon({
        uid: 'max-iv',
        name: 'Lv 50 Max IV',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // TOT = 186
      });

      const team = buildAutoRankedTeam([lv50Iv100, lv50Iv186], frontierRules, 1);
      expect(team).toHaveLength(1);
      // Equal level (50), lv50Iv186 beats lv50Iv100
      expect(team[0]?.uid).toBe('max-iv');
    });

    it('prioritizes EV-trained Pokemon over untrained Pokemon when levels and IVs are tied', () => {
      const lv50Untrained = createTestPokemon({
        uid: 'untrained',
        name: 'Dragonite Untrained',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      });
      const lv50Trained = createTestPokemon({
        uid: 'trained',
        name: 'Dragonite EV Trained',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 } // 508 EVs = +127 bonus
      });

      const team = buildAutoRankedTeam([lv50Untrained, lv50Trained], frontierRules, 1);
      expect(team).toHaveLength(1);
      expect(team[0]?.uid).toBe('trained');
    });
  });

  describe('Comprehensive Coverage: All 12 Ranked Seasons', () => {
    it('Month 1 (monotype_clash): enforces single-type rule', () => {
      const theme = getSeasonalThemeForMonth(1);
      const singleType = createTestPokemon({ id: 'pikachu', species: 'pikachu', type: 'electric', type2: undefined });
      const dualType = createTestPokemon({ id: 'charizard', species: 'charizard', type: 'fire', type2: 'flying' });

      expect(evaluatePokemonForSeason(singleType, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(dualType, theme).eligible).toBe(false);
    });

    it('Month 2 (kanto_classic): allows Gen 1 and bans Kanto legendaries', () => {
      const theme = getSeasonalThemeForMonth(2);
      const kantoNormal = createTestPokemon({ id: 'blastoise', species: 'blastoise', type: 'water', level: 50 });
      const mewtwo = createTestPokemon({ id: 'mewtwo', species: 'mewtwo', type: 'psychic', level: 50 });
      const johtoMon = createTestPokemon({ id: 'totodile', species: 'totodile', type: 'water', level: 50 });

      expect(evaluatePokemonForSeason(kantoNormal, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(mewtwo, theme).eligible).toBe(false); // Banned legendary
      expect(evaluatePokemonForSeason(johtoMon, theme).eligible).toBe(false); // Gen 2 not in allowedGenerations: [1]
    });

    it('Month 3 (little_cup): enforces max level 5 and unevolved with evolutions', () => {
      const theme = getSeasonalThemeForMonth(3);
      const pichuLv5 = createTestPokemon({ id: 'pichu', species: 'pichu', level: 5, type: 'electric' });
      const pichuLv6 = createTestPokemon({ id: 'pichu', species: 'pichu', level: 6, type: 'electric' });
      const pikachuLv5 = createTestPokemon({ id: 'pikachu', species: 'pikachu', level: 5, type: 'electric' }); // Has prevo

      expect(evaluatePokemonForSeason(pichuLv5, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(pichuLv6, theme).eligible).toBe(false); // Over levelCap 5
      expect(evaluatePokemonForSeason(pikachuLv5, theme).eligible).toBe(false); // Not first stage
    });

    it('Month 4 (weather_masters): allows Water, Fire, Rock, Ice, Grass', () => {
      const theme = getSeasonalThemeForMonth(4);
      const waterMon = createTestPokemon({ id: 'blastoise', species: 'blastoise', type: 'water' });
      const psychicMon = createTestPokemon({ id: 'alakazam', species: 'alakazam', type: 'psychic' });

      expect(evaluatePokemonForSeason(waterMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(psychicMon, theme).eligible).toBe(false);
    });

    it('Month 5 (dual_type_duo): requires exactly two combined types', () => {
      const theme = getSeasonalThemeForMonth(5);
      const dualType = createTestPokemon({ id: 'gengar', species: 'gengar', type: 'ghost', type2: 'poison' });
      const singleType = createTestPokemon({ id: 'alakazam', species: 'alakazam', type: 'psychic', type2: undefined });

      expect(evaluatePokemonForSeason(dualType, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(singleType, theme).eligible).toBe(false);
    });

    it('Month 6 (no_legendaries): bans legendaries and mythics', () => {
      const theme = getSeasonalThemeForMonth(6);
      const dragonite = createTestPokemon({ id: 'dragonite', species: 'dragonite', type: 'dragon', type2: 'flying' });
      const zapdos = createTestPokemon({ id: 'zapdos', species: 'zapdos', type: 'electric', type2: 'flying' });

      expect(evaluatePokemonForSeason(dragonite, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(zapdos, theme).eligible).toBe(false);
    });

    it('Month 7 (speed_warp): allows Electric, Flying, Psychic, Ghost', () => {
      const theme = getSeasonalThemeForMonth(7);
      const electricMon = createTestPokemon({ id: 'jolteon', species: 'jolteon', type: 'electric', type2: undefined });
      const groundMon = createTestPokemon({ id: 'sandslash', species: 'sandslash', type: 'ground', type2: undefined });

      expect(evaluatePokemonForSeason(electricMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(groundMon, theme).eligible).toBe(false);
    });

    it('Month 8 (elemental_triad): allows Fire, Water, Grass', () => {
      const theme = getSeasonalThemeForMonth(8);
      const grassMon = createTestPokemon({ id: 'venusaur', species: 'venusaur', type: 'grass', type2: 'poison' });
      const normalMon = createTestPokemon({ id: 'snorlax', species: 'snorlax', type: 'normal', type2: undefined });

      expect(evaluatePokemonForSeason(grassMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(normalMon, theme).eligible).toBe(false);
    });

    it('Month 9 (johto_kanto_frontier): allows Gen 1 and Gen 2, rejects Gen 3+', () => {
      const theme = getSeasonalThemeForMonth(9);
      const gen1 = createTestPokemon({ id: 'pikachu', species: 'pikachu', type2: undefined });
      const gen2 = createTestPokemon({ id: 'totodile', species: 'totodile', type2: undefined });
      const gen3 = createTestPokemon({ id: 'castform', species: 'castform', type2: undefined });

      expect(evaluatePokemonForSeason(gen1, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(gen2, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(gen3, theme).eligible).toBe(false);
    });

    it('Month 10 (halloween_spook): allows Ghost, Dark, Poison', () => {
      const theme = getSeasonalThemeForMonth(10);
      const ghostMon = createTestPokemon({ id: 'haunter', species: 'haunter', type: 'ghost', type2: 'poison' });
      const normalMon = createTestPokemon({ id: 'eevee', species: 'eevee', type: 'normal', type2: undefined });

      expect(evaluatePokemonForSeason(ghostMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(normalMon, theme).eligible).toBe(false);
    });

    it('Month 11 (titan_clash): allows Dragon, Steel, Fighting', () => {
      const theme = getSeasonalThemeForMonth(11);
      const fightingMon = createTestPokemon({ id: 'machamp', species: 'machamp', type: 'fighting', type2: undefined });
      const fairyMon = createTestPokemon({ id: 'clefable', species: 'clefable', type: 'fairy', type2: undefined });

      expect(evaluatePokemonForSeason(fightingMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(fairyMon, theme).eligible).toBe(false);
    });

    it('Month 12 (masters_allstars): open format, accepts all valid species <= Lv 50', () => {
      const theme = getSeasonalThemeForMonth(12);
      const anyMon = createTestPokemon({ id: 'gyarados', species: 'gyarados', level: 50 });
      const overLvMon = createTestPokemon({ id: 'gyarados', species: 'gyarados', level: 60 });

      expect(evaluatePokemonForSeason(anyMon, theme).eligible).toBe(true);
      expect(evaluatePokemonForSeason(overLvMon, theme).eligible).toBe(false);
    });
  });
});
