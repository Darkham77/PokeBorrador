import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';
import { getSpeciesHistory } from '@/logic/pokemon/evolutionEngine';
import {
  POKEMON_DB,
  isPokemonDbSpeciesId,
  type PokemonDbSpeciesId
} from '@/data/pokemon/pokemonDB';
import { getSpeciesEggMoves } from '@/data/pokemon/eggMoves';

const MAX_LEGAL_RANDOM_MOVE_SLOTS = 4 as const;

/**
 * Checks if a Pokémon can learn a specific move according to the precomputed database.
 * Inspects full evolutionary lineage (pre-evolutions) in the canonical DB.
 * If `level` is specified, level-up moves require `learnLevel <= level`.
 * Compatible moves (TM, Tutor, Egg, Special, past transfers) are legal at any level.
 */
export function canLearnMove(
  speciesId: PokemonSpeciesId,
  moveId: PokemonMoveId,
  level?: number
): boolean {
  if (!speciesId || !moveId) return false;

  const history = getSpeciesHistory(speciesId);
  const targetSpecies = history.length > 0 ? history : [speciesId];

  for (const spId of targetSpecies) {
    if (!isPokemonDbSpeciesId(spId)) continue;
    const staticData = POKEMON_DB[spId];

    // 1. Compat moves (TM, Egg, Tutor, Special, Past transfers) are legal at any level
    if (staticData.compatMoves && staticData.compatMoves.includes(moveId)) {
      return true;
    }

    const eggMoves = getSpeciesEggMoves(spId);
    if (eggMoves.includes(moveId)) {
      return true;
    }

    // 2. Level-up moves
    if (staticData.learnset) {
      const found = staticData.learnset.find((m) => m.id === moveId);
      if (found && (level === undefined || found.lv <= level)) {
        return true;
      }
    }
  }

  return false;
}

function collectSpeciesStaticMoves(
  spId: PokemonDbSpeciesId,
  targetLevel: number | undefined,
  dest: Set<PokemonMoveId>
): void {
  const staticData = POKEMON_DB[spId];
  if (staticData.learnset) {
    for (const m of staticData.learnset) {
      if (targetLevel === undefined || m.lv <= targetLevel) {
        dest.add(m.id);
      }
    }
  }

  if (staticData.compatMoves) {
    for (const mId of staticData.compatMoves) {
      dest.add(mId);
    }
  }

  const eggMoves = getSpeciesEggMoves(spId);
  for (const em of eggMoves) {
    dest.add(em);
  }
}

/**
 * Gets the complete list of legal moves for a given species and optional level.
 * Includes moves learned through pre-evolutions and compatible moves.
 */
export function getLegalSpeciesMoves(speciesId: PokemonSpeciesId, level?: number): PokemonMoveId[] {
  if (!speciesId) return [];
  const legalMoveIds = new Set<PokemonMoveId>(); // runtime-set: Legal moves accumulator set
  const targetLevel =
    level !== undefined ? Math.max(1, Math.min(MAX_POKEMON_LEVEL, level)) : undefined;

  const history = getSpeciesHistory(speciesId);
  const targetSpecies = history.length > 0 ? history : [speciesId];

  for (const spId of targetSpecies) {
    if (isPokemonDbSpeciesId(spId)) {
      collectSpeciesStaticMoves(spId, targetLevel, legalMoveIds);
    }
  }

  if (legalMoveIds.size === 0) {
    const fallbackId = speciesId === 'unown' ? 'hiddenpower' : 'tackle';
    legalMoveIds.add(requirePokemonMoveId(fallbackId));
  }

  return Array.from(legalMoveIds);
}

/**
 * Calculates maximum number of legal moves a Pokémon can know based on its level.
 */
export function getMaxAllowedMoves(speciesId: PokemonSpeciesId, level: number): number {
  if (!speciesId || !isPokemonDbSpeciesId(speciesId)) return 1;
  const defaultMoves = getMovesAtLevel(speciesId, level, true);
  return Math.max(1, Math.min(MAX_LEGAL_RANDOM_MOVE_SLOTS, defaultMoves.length));
}

/**
 * Selects up to `maxSlots` random legal moves for a species and level.
 * Respects maximum number of moves the Pokémon can know at that level
 * and fills remaining slots with `null`.
 */
export function getRandomLegalMoves(
  speciesId: PokemonSpeciesId,
  level: number,
  maxSlots: number = MAX_LEGAL_RANDOM_MOVE_SLOTS
): (PokemonMoveId | null)[] {
  const legalMoves = getLegalSpeciesMoves(speciesId, level);
  if (legalMoves.length === 0) {
    return [requirePokemonMoveId('tackle'), null, null, null];
  }

  const maxAllowed = getMaxAllowedMoves(speciesId, level);
  const targetCount = Math.min(maxSlots, maxAllowed);
  const shuffled = legalMoves.toSorted(() => 0.5 - Math.random());
  const selectedCount = Math.min(targetCount, shuffled.length);
  const result: (PokemonMoveId | null)[] = [];

  for (let i = 0; i < maxSlots; i++) {
    const move = shuffled[i];
    if (i < selectedCount && move) {
      result.push(move);
    } else {
      result.push(null);
    }
  }

  return result;
}
