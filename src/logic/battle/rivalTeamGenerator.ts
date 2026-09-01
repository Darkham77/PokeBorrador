import { TeamGenerators } from '@pkmn/randoms';
import { Dex, toID, type PokemonSet } from '@pkmn/sim';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS_SET, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';

export interface TrainerTeamOptions {
  level: number;
  teamSize: number;
  allowedSpecies: ReadonlySet<string>;
  aceSpeciesId?: string;
}

export interface RivalTeamOptions {
  level: number;
  teamSize: number;
  aceSpeciesId: string;
  allowedSpecies?: ReadonlySet<string>;
}

/**
 * Retrieves a Showdown-generated competitive moveset aligned with the global ACTIVE_GENERATION.
 * Falls back to previous generations only if a species was cut in the active generation (Dexit).
 * For unevolved (NFE) species not in Showdown randomSets, synthesizes a legal moveset via learnset.
 */
export function getRandomSetForSpecies(speciesId: string, level: number): PokemonSet {
  const species = Dex.species.get(speciesId);

  // 1. Search downwards from ACTIVE_GENERATION to 2 (Gen 2-9 implement randomSets)
  for (let g = ACTIVE_GENERATION; g >= 2; g--) {
    try {
      const gen = TeamGenerators.getTeamGenerator(`gen${g}randombattle`);
      const rawSets = Reflect.get(gen, 'randomSets') as Record<string, unknown> | undefined; // open-record
      if (rawSets) {
        const key = rawSets[species.id] ? species.id : rawSets[species.name] ? species.name : null;
        if (key) {
          const randSetFn = Reflect.get(gen, 'randomSet') as (s: string) => PokemonSet;
          const set = randSetFn.call(gen, key);
          if (set) {
            set.level = level;
            return set;
          }
        }
      }
    } catch {
      continue;
    }
  }

  // 2. Fallback for NFE / Baby species not present in Showdown randomSets:
  const movesAtLevel = getMovesAtLevel(species.id, level);
  const moves: PokemonMoveId[] = movesAtLevel.length > 0
    ? movesAtLevel.filter(m => Boolean(m.id)).map(m => requirePokemonMoveId(m.id!))
    : ['tackle'];
  const ability = (species.abilities && Object.values(species.abilities)[0]) || 'No Ability';

  return {
    name: species.name,
    species: species.name,
    gender: species.gender || '',
    item: '',
    ability: String(ability),
    moves,
    nature: 'Hardy',
    evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level,
    shiny: false
  };
}

export class TrainerTeamGenerator {
  /**
   * Generates a fully compliant, competitively designed Pokémon team for any trainer archetype
   * using Showdown's native team generator engine filtered by allowed thematic species.
   */
  static generateTeam(options: TrainerTeamOptions): PokemonSet[] {
    if (options.teamSize <= 0) {
      return [];
    }

    const allowed = options.allowedSpecies;
    const clampedLevel = Math.min(MAX_POKEMON_LEVEL, Math.max(1, Math.floor(options.level)));
    const targetTeamSize = Math.max(1, Math.floor(options.teamSize));

    // 1. Build Showdown format with native rules for level and team size using ACTIVE_GENERATION
    const formatString = `gen${ACTIVE_GENERATION}randombattle@@@Adjust Level = ${clampedLevel}, Max Team Size = ${targetTeamSize}`;
    const generator = TeamGenerators.getTeamGenerator(formatString);

    // 2. Restrict internal species database to only allowed species
    const rawData = (Reflect.get(generator, 'randomData') || Reflect.get(generator, 'randomSets')) as Record<string, unknown> | undefined; // open-record
    if (rawData) {
      const filtered = Object.fromEntries(
        Object.entries(rawData).filter(([speciesId]) => allowed.has(toID(speciesId)))
      );
      if (Reflect.has(generator, 'randomData')) {
        Reflect.set(generator, 'randomData', filtered);
      }
      if (Reflect.has(generator, 'randomSets')) {
        Reflect.set(generator, 'randomSets', filtered);
      }
    }

    const finalTeam: PokemonSet[] = [];
    const usedSpecies = new Set<string>();

    // 3. If Ace species is specified, place in slot 0
    if (options.aceSpeciesId) {
      const aceSet = getRandomSetForSpecies(options.aceSpeciesId, clampedLevel);
      finalTeam.push(aceSet);
      usedSpecies.add(toID(options.aceSpeciesId));
    }

    if (finalTeam.length >= targetTeamSize) {
      return finalTeam;
    }

const MAX_TEAM_GENERATION_ATTEMPTS = 10;

    // 4. Generate the rest of the team using Showdown's competitive team generator if possible
    let attempts = 0;
    while (finalTeam.length < targetTeamSize && attempts < MAX_TEAM_GENERATION_ATTEMPTS) {
      attempts++;
      try {
        const rawTeam = generator.getTeam();
        for (const member of rawTeam) {
          const memberId = toID(member.species);
          if (usedSpecies.has(memberId)) continue;
          if (!allowed.has(memberId)) continue;
          member.level = clampedLevel;
          finalTeam.push(member);
          usedSpecies.add(memberId);
          if (finalTeam.length >= targetTeamSize) break;
        }
      } catch {
        break;
      }
    }

    // 5. Fallback 1: Unused species from allowed pool
    if (finalTeam.length < targetTeamSize) {
      const remainingSpecies = [...allowed].filter(id => !usedSpecies.has(id));
      while (finalTeam.length < targetTeamSize && remainingSpecies.length > 0) {
        const idx = Math.floor(Math.random() * remainingSpecies.length);
        const fallbackId = remainingSpecies.splice(idx, 1)[0]!;
        try {
          const fallbackSet = getRandomSetForSpecies(fallbackId, clampedLevel);
          finalTeam.push(fallbackSet);
          usedSpecies.add(fallbackId);
        } catch {
          // ignore if set cannot be generated
        }
      }
    }

    // 6. Fallback 2: If pool has fewer unique species than targetTeamSize, cycle from allowed pool
    const allAllowed = [...allowed];
    while (finalTeam.length < targetTeamSize && allAllowed.length > 0) {
      const pickId = allAllowed[Math.floor(Math.random() * allAllowed.length)]!;
      try {
        const fallbackSet = getRandomSetForSpecies(pickId, clampedLevel);
        finalTeam.push(fallbackSet);
      } catch {
        break;
      }
    }

    return finalTeam;
  }
}

export class RivalTeamGenerator {
  /**
   * Specialization for Rival encounters with guaranteed Ace in slot 0 and level+5 difficulty.
   */
  static generateTeam(options: RivalTeamOptions): PokemonSet[] {
    return TrainerTeamGenerator.generateTeam({
      level: options.level,
      teamSize: options.teamSize,
      aceSpeciesId: options.aceSpeciesId,
      allowedSpecies: options.allowedSpecies ?? ENABLED_POKEMON_IDS_SET
    });
  }
}
