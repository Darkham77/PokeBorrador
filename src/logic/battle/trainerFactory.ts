import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { ACTIVE_AI_TEAM_GENERATION_GEN } from '@/data/system/constants';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { TeamGenerators } from '@pkmn/randoms';
import { toID } from '@pkmn/sim';

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
    cat: (m.cat as 'physical' | 'special' | 'status') || 'physical',
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

  p.heldItem = toID(set.item) || null;
  recalcPokemonStats(p, true);
  validatePokemon(p, true);
}

/**
 * Builds a list of Pokémon for a trainer based on a pool of archetypes, level, and team size.
 */
export async function buildTrainerTeam(
  pool: readonly PokemonSpeciesId[],
  trainerLv: number,
  teamSize: number
): Promise<Pokemon[]> {
  const { getEvolvedForm } = await import('@/logic/evolution/evolutionLogic');
  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');

  // Inicializa el generador competitivo
  const generator = TeamGenerators.getTeamGenerator(`gen${ACTIVE_AI_TEAM_GENERATION_GEN}randombattle`);
  const generatorWithRandomSet = generator as unknown as { randomSet: (s: string) => { moves: string[]; ability: string; item: string } };

  const enemyTeam: Pokemon[] = [];
  const usedSpecies: PokemonSpeciesId[] = [];

  if (pool.length === 0) {
    throw new Error('[trainerFactory] Trainer species pool is empty');
  }

  for (let i = 0; i < teamSize; i++) {
    // Intentar sacar un pokémon del pool que no se haya usado
    const availablePool = pool.filter(id => !usedSpecies.includes(id));
    const sourcePool = availablePool.length > 0 ? availablePool : pool;
    const pIdBase = sourcePool[Math.floor(Math.random() * sourcePool.length)]!;
    const pId = getEvolvedForm(pIdBase, trainerLv);
    
    const p = makePokemon(pId, trainerLv, { bypassWhitelist: true }) as Pokemon;
    if (p) {
      try {
        const set = generatorWithRandomSet.randomSet(pId);
        await applyCompetitiveSet(p, set);
      } catch {
        // Fallback si no tiene set: intentamos obtener uno genérico de getTeam()
        const rawTeam = generator.getTeam();
        const setMatch = rawTeam.find(s => toID(s.species) === toID(pId));
        if (setMatch) {
          await applyCompetitiveSet(p, setMatch);
        }
      }
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      usedSpecies.push(pId);
      enemyTeam.push(p);
    }
  }
  return enemyTeam;
}
