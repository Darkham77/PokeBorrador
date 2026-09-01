import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MoveCategory } from '@/data/battle/moves';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isEnabledPokemonId } from '@/data/system/constants';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { toID } from '@/logic/utils/strings.ts';
import { isItemId } from '@/data/inventory/items';

/**
 * Aplica un set competitivo de la librería a un Pokémon.
 */
export async function applyCompetitiveSet(
  p: Pokemon,
  set: { moves: string[]; ability: string; item: string }
): Promise<void> {
  const { recalcPokemonStats, validatePokemon } = await import('@/logic/pokemon/pokemonFactory');
  
  const moveEntries = set.moves
    .map(id => pokemonDataProvider.getMoveData(toID(id)))
    .filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined);

  if (moveEntries.length === 0) {
    throw new Error(
      `[trainerFactory] Ningún movimiento del set competitivo existe en pokemonDataProvider para ${p.id}: [${set.moves.join(', ')}]`
    );
  }

  p.moves = moveEntries.slice(0, 4).map(m => ({
    id: m.id,
    name: m.name,
    pp: m.pp,
    maxPP: m.pp,
    type: m.type || 'normal',
    power: m.power || 0,
    acc: m.acc || 100,
    cat: (m.cat as MoveCategory) || 'physical',
    priority: m.priority,
    effect: m.effect,
    recoil: m.recoil,
    selfKO: m.selfKO,
    drain: m.drain,
    hits: m.hits,
    fixedDmg: m.fixedDmg,
    ohko: m.ohko,
    halfHP: m.halfHP,
    endeavor: m.endeavor,
    levelDmg: m.levelDmg,
    counter: m.counter,
    turns: m.turns,
    sound: m.sound,
  }));

  const rawItemId = toID(set.item);
  p.heldItem = isItemId(rawItemId) ? rawItemId : null;
  recalcPokemonStats(p);
  validatePokemon(p, true);
}

/**
 * Builds a list of Pokémon for a trainer based on a pool of archetypes, level, and team size
 * using Showdown's native competitive team generation engine.
 */
export async function buildTrainerTeam(
  pool: readonly PokemonSpeciesId[],
  trainerLv: number,
  teamSize: number
): Promise<Pokemon[]> {
  if (teamSize <= 0) {
    return [];
  }

  if (pool.length === 0) {
    throw new Error('[trainerFactory] Trainer species pool is empty');
  }

  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
  const { TrainerTeamGenerator } = await import('./rivalTeamGenerator');
  const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

  const poolSet = new Set(pool); // runtime-set
  const generatedSets = TrainerTeamGenerator.generateTeam({
    level: trainerLv,
    teamSize,
    allowedSpecies: poolSet
  });

  const enemyTeam: Pokemon[] = [];

  for (const set of generatedSets) {
    const speciesId = requirePokemonSpeciesId(toID(set.species));
    if (!isEnabledPokemonId(speciesId)) {
      throw new Error(`[trainerFactory] Cannot create trainer pokemon for non-enabled species: ${speciesId}`);
    }

    const p = makePokemon(speciesId, trainerLv) as Pokemon;
    if (p) {
      await applyCompetitiveSet(p, set);
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      enemyTeam.push(p);
    }
  }

  return enemyTeam;
}
