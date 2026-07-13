import { describe, it, expect } from 'vitest';
import { processGymVictory } from '@/logic/gym/gymEngine';
import { GYMS } from '@/data/world/gyms';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { mapToShowdownSet, getShowdownFormatId } from '@/logic/battle/showdownAdapter';
import { getShowdownNickname } from '@/logic/battle/showdownUidMapper';
import { Battle } from '@pkmn/sim';
import { PDEX_ORDER } from '@/data/pokemon/pokedex';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Gym Engine', () => {
  const mockGym = { id: 'pewter', leader: 'Brock', rewardTM: 'MT39 Tumba Rocas' };

  it('should give TM on first victory (Easy)', () => {
    const state = { defeatedGyms: [], gymProgress: {} };
    const result = processGymVictory(mockGym, 'easy', state as unknown as Parameters<typeof processGymVictory>[2]);
    
    expect(result.tmDropped).toBe(true);
    expect(result.isFirstTime).toBe(true);
    expect(result.newProgress).toBe(1);
  });

  it('should not give TM on Easy rematch', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    const result = processGymVictory(mockGym, 'easy', state as unknown as Parameters<typeof processGymVictory>[2]);
    
    expect(result.tmDropped).toBe(false);
    expect(result.isFirstTime).toBe(false);
    expect(result.extraCoins).toBe(150);
  });

  it('should validate Normal rematch drop rate (~3%)', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    let drops = 0;
    const SAMPLES = 1000; // Reduced samples count for faster test runs
    
    for (let i = 0; i < SAMPLES; i++) {
      if (processGymVictory(mockGym, 'normal', state as unknown as Parameters<typeof processGymVictory>[2]).tmDropped) drops++;
    }
    
    const rate = drops / SAMPLES;
    expect(rate).toBeGreaterThan(0.01);
    expect(rate).toBeLessThan(0.05);
  });

  it('should validate Hard rematch drop rate (~5%)', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    let drops = 0;
    const SAMPLES = 1000; // Reduced samples count for faster test runs
    
    for (let i = 0; i < SAMPLES; i++) {
      if (processGymVictory(mockGym, 'hard', state as unknown as Parameters<typeof processGymVictory>[2]).tmDropped) drops++;
    }
    
    const rate = drops / SAMPLES;
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.08);
  });

  describe('Gym Battle Teams Simulation', () => {
    GYMS.forEach(gym => {
      (['easy', 'normal', 'hard'] as const).forEach(difficulty => {
        it(`should successfully choose first move for first active Pokemon in Gym: ${gym.name} (${difficulty})`, () => {
          const diffData = gym.difficulties[difficulty] || gym.difficulties.easy;
          const enemyTeam = diffData.pokemon.map((id, idx) => makePokemon(id, diffData.levels[idx] || 1, { bypassWhitelist: true })).filter((p): p is Pokemon => p !== null);
          
          expect(enemyTeam.length).toBeGreaterThan(0);
          
          const startingEnemy = enemyTeam.find(p => p && p.hp > 0);
          expect(startingEnemy).toBeDefined();

          const playerPoke = makePokemon('bulbasaur', 15)!;

          const p1Team = [mapToShowdownSet(playerPoke)];
          const p2Team = enemyTeam.map(p => mapToShowdownSet(p));

          const battle = new Battle({ 
            formatid: getShowdownFormatId()
          });

          battle.setPlayer('p1', { name: 'Player', team: p1Team });
          battle.setPlayer('p2', { name: 'GymLeader', team: p2Team });

          // Showdown starts with index 0 (first member of team) as the active pokemon
          const firstEnemy = enemyTeam[0];
          if (!firstEnemy) throw new Error('Expected at least one enemy');
          const expectedActiveName = getShowdownNickname(firstEnemy.uid);
          const actualActiveName = battle.p2.active[0]?.name;
          expect(actualActiveName).toBe(expectedActiveName);

          // Get first move of the starting active pokemon
          const activePokeMoves = firstEnemy.moves;
          expect(activePokeMoves.length).toBeGreaterThan(0);
          const firstMove = activePokeMoves[0];
          if (!firstMove || !firstMove.id) throw new Error('Expected first move to have an id');
          const firstMoveId = activePokePokeIdToID(firstMove.id);

          battle.choose('p1', 'move 1');
          const res = battle.choose('p2', `move ${firstMoveId}`);
          expect(res).toBe(true);
        });
      });
    });
  });

  describe('Gym Gen 1 Restrictiveness', () => {
    it('should only contain Generation 1 (Kanto) Pokemon across all gyms and difficulties', () => {
      const kantoPokedex = new Set(PDEX_ORDER);
      GYMS.forEach(gym => {
        (['easy', 'normal', 'hard'] as const).forEach(difficulty => {
          const diffData = gym.difficulties[difficulty] || gym.difficulties.easy;
          diffData.pokemon.forEach(pokeId => {
            expect(kantoPokedex.has(pokeId)).toBe(true);
          });
        });
      });
    });
  });
});

function activePokePokeIdToID(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

