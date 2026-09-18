/**
 * src/logic/pokemon/pokemonSpeciesHelper.ts
 *
 * Canonical species metadata and evolutionary tier resolver for client & PvP.
 * Replaces runtime Showdown (@pkmn/sim) Dex queries with O(1) static data lookups.
 */

import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping.ts';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';
import {
  EVOLUTION_TABLE,
  STONE_EVOLUTIONS,
  TRADE_EVOLUTIONS
} from '@/data/pokemon/evolutionData.ts';

const GEN1_MAX = 151;
const GEN2_MAX = 251;
const GEN3_MAX = 386;
const GEN4_MAX = 493;
const GEN5_MAX = 649;
const GEN6_MAX = 721;
const GEN7_MAX = 809;
const GEN8_MAX = 905;

/**
 * Derives the canonical Pokémon Generation (1-9) from national dex number.
 */
function getPokemonGenerationFromDexNumber(dexNum: number): number {
  if (dexNum <= 0) return 1;
  if (dexNum <= GEN1_MAX) return 1;
  if (dexNum <= GEN2_MAX) return 2;
  if (dexNum <= GEN3_MAX) return 3;
  if (dexNum <= GEN4_MAX) return 4;
  if (dexNum <= GEN5_MAX) return 5;
  if (dexNum <= GEN6_MAX) return 6;
  if (dexNum <= GEN7_MAX) return 7;
  if (dexNum <= GEN8_MAX) return 8;
  return 9;
}

/**
 * Returns the national dex number for a species ID.
 */
export function getPokemonDexNumber(speciesId: PokemonSpeciesId): number {
  const num = Reflect.get(POKEMON_SPRITE_IDS, speciesId) as number | undefined;
  return typeof num === 'number' ? num : 0;
}

/**
 * Returns the generation of a Pokémon species.
 */
export function getPokemonGeneration(speciesId: PokemonSpeciesId): number {
  const dexNum = getPokemonDexNumber(speciesId);
  return getPokemonGenerationFromDexNumber(dexNum);
}

// ─── Pre-computed Little Cup Sets (O(1) Evaluation) ─────────────────────────

// Set of species that evolve from something else (i.e. hasPrevo === true)
const EVOLVED_SPECIES_SET = new Set<string>();

// Set of species that are capable of evolving into another form (i.e. hasEvos === true)
const CAN_EVOLVE_SPECIES_SET = new Set<string>();

function initEvolutionSets(): void {
  // 1. Level evolutions
  for (const [from, evo] of Object.entries(EVOLUTION_TABLE)) {
    if (evo && typeof evo === 'object' && 'to' in evo && typeof evo.to === 'string') {
      CAN_EVOLVE_SPECIES_SET.add(from);
      EVOLVED_SPECIES_SET.add(evo.to);
    }
  }

  // 2. Stone evolutions
  for (const [key, evo] of Object.entries(STONE_EVOLUTIONS)) {
    if (evo && typeof evo === 'object' && 'to' in evo && typeof evo.to === 'string') {
      // Keys can be "eevee_vaporeon" or just species name
      const baseSpecies = key.includes('_') ? key.split('_')[0]! : key;
      CAN_EVOLVE_SPECIES_SET.add(baseSpecies);
      EVOLVED_SPECIES_SET.add(evo.to);
    }
  }

  // 3. Trade evolutions
  for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
    if (typeof to === 'string') {
      CAN_EVOLVE_SPECIES_SET.add(from);
      EVOLVED_SPECIES_SET.add(to);
    }
  }
}

initEvolutionSets();

/**
 * Determines if a Pokémon species satisfies the competitive Little Cup condition:
 * - Has NEVER evolved (no pre-evolution: hasPrevo === false)
 * - CAN evolve into a higher form (hasEvos === true)
 */
export function isLittleCupEligible(speciesId: PokemonSpeciesId): boolean {
  const hasPrevo = EVOLVED_SPECIES_SET.has(speciesId);
  const canEvolve = CAN_EVOLVE_SPECIES_SET.has(speciesId);
  return !hasPrevo && canEvolve;
}
