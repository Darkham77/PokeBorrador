import { TeamGenerators } from '@pkmn/randoms';
import { Dex, type PokemonSet } from '@pkmn/sim';
import { toID } from '@/logic/utils/strings.ts';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS_SET, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { logger } from '@/logic/utils/logger';

export interface TrainerTeamOptions {
  level: number;
  teamSize: number;
  allowedSpecies: ReadonlySet<PokemonSpeciesId | string>;
  aceSpeciesId?: PokemonSpeciesId;
}

export interface RivalTeamOptions {
  level: number;
  teamSize: number;
  aceSpeciesId: PokemonSpeciesId;
  allowedSpecies?: ReadonlySet<PokemonSpeciesId | string>;
}

const OLDEST_RANDOM_SET_GEN = 2;
const MAX_TEAM_GENERATION_ATTEMPTS = 10;
const DEFAULT_FALLBACK_EVS = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 } as const;
const DEFAULT_FALLBACK_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } as const;

function locateShowdownRandomSet(speciesId: PokemonSpeciesId, speciesName: string, level: number): PokemonSet | null {
  for (let g = ACTIVE_GENERATION; g >= OLDEST_RANDOM_SET_GEN; g--) {
    try {
      const gen = TeamGenerators.getTeamGenerator(`gen${g}randombattle`);
      const rawSets = Reflect.get(gen, 'randomSets') as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
      if (!rawSets) continue;

      const key = rawSets[speciesId] ? speciesId : rawSets[speciesName] ? speciesName : null;
      if (!key) continue;

      const randSetFn = Reflect.get(gen, 'randomSet') as (s: string) => PokemonSet;
      const set = randSetFn.call(gen, key);
      if (set) {
        set.level = level;
        return set;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function buildFallbackPokemonSet(species: ReturnType<typeof Dex.species.get>, level: number): PokemonSet {
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
    nature: 'hardy',
    evs: { ...DEFAULT_FALLBACK_EVS },
    ivs: { ...DEFAULT_FALLBACK_IVS },
    level,
    shiny: false
  };
}

/**
 * Retrieves a Showdown-generated competitive moveset aligned with the global ACTIVE_GENERATION.
 * Falls back to previous generations only if a species was cut in the active generation (Dexit).
 * For unevolved (NFE) species not in Showdown randomSets, synthesizes a legal moveset via learnset.
 */
export function getRandomSetForSpecies(speciesId: PokemonSpeciesId, level: number): PokemonSet {
  const species = Dex.species.get(speciesId);
  const competitiveSet = locateShowdownRandomSet(speciesId, species.name, level);
  if (competitiveSet) {
    return competitiveSet;
  }
  return buildFallbackPokemonSet(species, level);
}

function restrictGeneratorAllowedSpecies(
  generator: ReturnType<typeof TeamGenerators.getTeamGenerator>,
  allowed: ReadonlySet<PokemonSpeciesId | string>
): void {
  const rawData = (Reflect.get(generator, 'randomData') || Reflect.get(generator, 'randomSets')) as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
  if (!rawData) return;

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

function fillTeamFromShowdownGenerator(
  generator: ReturnType<typeof TeamGenerators.getTeamGenerator>,
  allowed: ReadonlySet<PokemonSpeciesId | string>,
  targetTeamSize: number,
  clampedLevel: number,
  finalTeam: PokemonSet[],
  usedSpecies: Set<string>
): void {
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
}

function fillTeamFromRemainingSpecies(
  allowed: ReadonlySet<PokemonSpeciesId | string>,
  targetTeamSize: number,
  clampedLevel: number,
  finalTeam: PokemonSet[],
  usedSpecies: Set<string>
): void {
  const remainingSpecies = [...allowed].filter(id => !usedSpecies.has(id));
  while (finalTeam.length < targetTeamSize && remainingSpecies.length > 0) {
    const idx = Math.floor(Math.random() * remainingSpecies.length);
    const fallbackId = remainingSpecies.splice(idx, 1)[0]!;
    try {
      const fallbackSet = getRandomSetForSpecies(requirePokemonSpeciesId(fallbackId), clampedLevel);
      finalTeam.push(fallbackSet);
      usedSpecies.add(fallbackId);
    } catch (err) {
      logger.warn('[rivalTeamGenerator] No se pudo generar set para fallbackId:', fallbackId, err);
    }
  }
}

function fillTeamByCyclingPool(
  allowed: ReadonlySet<PokemonSpeciesId | string>,
  targetTeamSize: number,
  clampedLevel: number,
  finalTeam: PokemonSet[]
): void {
  const allAllowed = [...allowed];
  while (finalTeam.length < targetTeamSize && allAllowed.length > 0) {
    const pickId = allAllowed[Math.floor(Math.random() * allAllowed.length)]!;
    try {
      const fallbackSet = getRandomSetForSpecies(requirePokemonSpeciesId(pickId), clampedLevel);
      finalTeam.push(fallbackSet);
    } catch (err) {
      logger.warn('[rivalTeamGenerator] No se pudo generar set para pickId:', pickId, err);
    }
  }
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
    restrictGeneratorAllowedSpecies(generator, allowed);

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

    // 4. Generate the rest of the team using Showdown's competitive team generator if possible
    fillTeamFromShowdownGenerator(generator, allowed, targetTeamSize, clampedLevel, finalTeam, usedSpecies);

    // 5. Fallback 1: Unused species from allowed pool
    if (finalTeam.length < targetTeamSize) {
      fillTeamFromRemainingSpecies(allowed, targetTeamSize, clampedLevel, finalTeam, usedSpecies);
    }

    // 6. Fallback 2: If pool has fewer unique species than targetTeamSize, cycle from allowed pool
    if (finalTeam.length < targetTeamSize) {
      fillTeamByCyclingPool(allowed, targetTeamSize, clampedLevel, finalTeam);
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
