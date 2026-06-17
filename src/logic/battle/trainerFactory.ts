import type { Pokemon } from '@/types/pokemon/pokemon';

/**
 * Builds a list of Pokémon for a trainer based on a pool of archetypes, level, and team size.
 */
export async function buildTrainerTeam(
  pool: string[] | readonly string[],
  trainerLv: number,
  teamSize: number
): Promise<Pokemon[]> {
  const { getEvolvedForm } = await import('@/logic/evolution/evolutionLogic');
  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');

  const enemyTeam: Pokemon[] = [];
  for (let i = 0; i < teamSize; i++) {
    const pIdBase = pool[Math.floor(Math.random() * pool.length)] || 'rattata';
    const pId = getEvolvedForm(pIdBase, trainerLv);
    const p = makePokemon(pId, trainerLv) as Pokemon;
    if (p) {
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      enemyTeam.push(p);
    }
  }
  return enemyTeam;
}
