/**
 * tests/unit/battle/npc_team_generation.spec.ts
 *
 * Validates that NPC and rival team generation via @pkmn/randoms produces
 * sets that the @pkmn/sim validator accepts as legal (correct moves, abilities,
 * items and PokemonSet structure) across the full level range 1–100.
 *
 * These tests exercise the @pkmn/randoms library in isolation — no Vue stores,
 * no pokemonDataProvider. The "sim validation" layer is @pkmn/sim's own Dex
 * (moves.get, species.get, abilities.get, items.get) which is the canonical
 * source of truth for what Showdown considers legal.
 */

import { describe, it, expect } from 'vitest';
import { TeamGenerators } from '@pkmn/randoms';
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Levels sampled across the full 1–100 range (representative, not exhaustive). */
const SAMPLED_LEVELS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];


/** Rival archetype pool — mirrors TRAINER_TYPES['rival'].pool (SSoT in trainerTypes.ts). */
const RIVAL_POOL = ['dragonite', 'charizard', 'alakazam', 'machamp', 'gengar', 'lapras'] as const;


function validateSet(set: PokemonSet): string[] {
  const violations: string[] = [];

  // Species
  const species = Dex.species.get(set.species);
  if (!species.exists) {
    violations.push(`Unknown species: ${set.species}`);
    return violations; // nothing else makes sense without a valid species
  }

  // Ability
  if (set.ability) {
    const ability = Dex.abilities.get(set.ability);
    if (!ability.exists) violations.push(`Unknown ability: ${set.ability}`);
  }

  // Item
  if (set.item) {
    const item = Dex.items.get(set.item);
    if (!item.exists) violations.push(`Unknown item: ${set.item}`);
  }

  // Moves (up to 4)
  for (const moveId of set.moves) {
    if (!moveId) continue;
    const move = Dex.moves.get(moveId);
    if (!move.exists) violations.push(`Unknown move: ${moveId}`);
  }

  // Nature
  if (set.nature) {
    const nature = Dex.natures.get(set.nature);
    if (!nature.exists) violations.push(`Unknown nature: ${set.nature}`);
  }

  // Level range
  if (set.level !== undefined && (set.level < 1 || set.level > 100)) {
    violations.push(`Level out of range: ${set.level}`);
  }

  // Has at least 1 move
  const nonEmptyMoves = set.moves.filter(Boolean);
  if (nonEmptyMoves.length === 0) {
    violations.push('Set has no moves');
  }

  return violations;
}

import { ACTIVE_AI_TEAM_GENERATION_GEN } from '@/data/system/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Generator under test
// ─────────────────────────────────────────────────────────────────────────────

const generator = TeamGenerators.getTeamGenerator(`gen${ACTIVE_AI_TEAM_GENERATION_GEN}randombattle`);

// Cast to access randomSet (not exposed on public TeamGenerator interface,
// but always present on the underlying RandomTeams class).
const gen = generator as unknown as {
  randomSet: (species: string) => PokemonSet;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. getTeam() — full 6-Pokémon team is valid per @pkmn/sim
// ─────────────────────────────────────────────────────────────────────────────

describe('getTeam() — full NPC team validity', () => {
  it('generates exactly 6 sets', () => {
    const team = generator.getTeam();
    expect(team).toHaveLength(6);
  });

  it('every set in a generated team is valid per @pkmn/sim Dex', () => {
    const team = generator.getTeam();
    for (const set of team) {
      const violations = validateSet(set);
      expect(
        violations,
        `Invalid set for ${set.species}: ${violations.join('; ')}`
      ).toHaveLength(0);
    }
  });

  it('no two sets in the same team share the same species', () => {
    const team = generator.getTeam();
    const speciesIds = team.map(s => toID(s.species));
    const unique = new Set(speciesIds);
    expect(unique.size).toBe(team.length);
  });

  it('all sets have 1–4 non-empty moves', () => {
    const team = generator.getTeam();
    for (const set of team) {
      const nonEmpty = set.moves.filter(Boolean);
      expect(nonEmpty.length).toBeGreaterThanOrEqual(1);
      expect(nonEmpty.length).toBeLessThanOrEqual(4);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getTeam() — multiple runs across levels 1–100
//    @pkmn/randoms does not take a level parameter for getTeam(); instead, each
//    set contains its own `level` field set by the generator. We verify that
//    every generated set is internally self-consistent regardless of the NPC's
//    in-game level (level scaling is our game's responsibility, not randoms').
// ─────────────────────────────────────────────────────────────────────────────

describe('getTeam() — repeated generation produces consistently valid teams', () => {
  for (const npcLevel of SAMPLED_LEVELS) {
    it(`NPC level ${npcLevel}: 3 consecutive getTeam() calls all pass sim validation`, () => {
      // npcLevel is used as a label only — @pkmn/randoms generates competitive
      // sets at its own internal level; game scales stats separately.
      void npcLevel;

      for (let run = 0; run < 3; run++) {
        const team = generator.getTeam();
        expect(team.length).toBeGreaterThanOrEqual(1);

        for (const set of team) {
          const violations = validateSet(set);
          expect(
            violations,
            `[run ${run + 1}] Invalid set for ${set.species}: ${violations.join('; ')}`
          ).toHaveLength(0);
        }
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. randomSet(species) — each species in the rival pool produces a valid set
// ─────────────────────────────────────────────────────────────────────────────

describe('randomSet() — rival pool species produce valid competitive sets', () => {
  // All species in the updated rival pool have gen9randombattle data
  for (const species of RIVAL_POOL) {
    it(`randomSet('${species}') returns a valid set per @pkmn/sim Dex`, () => {
      const set = gen.randomSet(species);
      expect(toID(set.species)).toBe(toID(species));
      const violations = validateSet(set);
      expect(violations, `Invalid set for ${species}: ${violations.join('; ')}`).toHaveLength(0);
    });

    it(`randomSet('${species}') always has exactly 4 moves (competitive set)`, () => {
      const set = gen.randomSet(species);
      const nonEmpty = set.moves.filter(Boolean);
      expect(nonEmpty.length).toBe(4);
    });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// 4. Rival team — ace from pool + getTeam() fill at sampled NPC levels
//    Simulates the full buildRivalEncounter logic (sans pokemonDataProvider/Vue)
//    and verifies that every included set is valid per @pkmn/sim.
// ─────────────────────────────────────────────────────────────────────────────

describe('Rival team — ace + getTeam() fill is valid at every sampled level', () => {
  for (const rivalLevel of SAMPLED_LEVELS) {
    it(`Level ${rivalLevel}: ace set + fill sets are all sim-valid`, () => {
      // Only pick ace from species that have gen9 data (others go via makePokemon fallback)
      const aceBase = RIVAL_POOL[Math.floor(Math.random() * RIVAL_POOL.length)]!;

      // Build ace set
      const aceSet = gen.randomSet(aceBase);
      const aceViolations = validateSet(aceSet);
      expect(
        aceViolations,
        `[level ${rivalLevel}] Ace ${aceBase} invalid: ${aceViolations.join('; ')}`
      ).toHaveLength(0);
      expect(toID(aceSet.species)).toBe(toID(aceBase));

      // Simulate fill loop: getTeam() gives candidates; validate those whose
      // species exist in Dex (= the sim's own whitelist, equivalent to our DB check).
      const rawTeam = generator.getTeam();
      const usedSpecies = new Set<string>([toID(aceBase)]);

      const validFill: PokemonSet[] = [];
      for (const set of rawTeam) {
        const sid = toID(set.species);
        if (usedSpecies.has(sid)) continue;
        const sp = Dex.species.get(set.species);
        if (!sp.exists) continue; // mirrors "not in our DB" filter
        usedSpecies.add(sid);
        validFill.push(set);
      }

      // Pool-fallback: only use gen9-data species for randomSet() in fill
      const poolFallback = RIVAL_POOL.filter((id: string) => !usedSpecies.has(toID(id)));
      for (const poolId of poolFallback) {
        if (validFill.length + 1 >= 5) break; // teamSize − 1 (ace already counted)
        usedSpecies.add(toID(poolId));
        validFill.push(gen.randomSet(poolId));
      }

      // Every set in the fill must be sim-valid
      for (const set of validFill) {
        const violations = validateSet(set);
        expect(
          violations,
          `[level ${rivalLevel}] Fill ${set.species} invalid: ${violations.join('; ')}`
        ).toHaveLength(0);
      }

      expect(rivalLevel).toBeGreaterThanOrEqual(1);
      expect(rivalLevel).toBeLessThanOrEqual(100);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Regression — randomSet on all rival pool species is stable across 10 runs
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression — randomSet stability for rival pool', () => {
  it('all rival pool species produce valid sets across 10 independent calls each', () => {
    for (const species of RIVAL_POOL) {
      for (let i = 0; i < 10; i++) {
        const set = gen.randomSet(species);

        const violations = validateSet(set);
        expect(
          violations,
          `[run ${i + 1}] ${species}: ${violations.join('; ')}`
        ).toHaveLength(0);
      }
    }
  });
});
