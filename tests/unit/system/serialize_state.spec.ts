import { describe, it, expect } from 'vitest';
import { serializeState } from '@/logic/auth/saveService';
import type { GameState } from '@/types/system/game';
import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('serializeState - Active Battle serialization', () => {
  it('should serialize activeBattle successfully when a battle is active', () => {
    const activeBattle: BattleState = {
      isGym: true,
      gymId: 'pewter',
      isTrainer: true,
      trainerName: 'Brock',
      locationId: 'pewter_gym',
      over: false,
      enemyTeam: [
        {
          uid: 'rhydon-1',
          id: 'rhydon',
          name: 'Rhydon',
          hp: 165,
          maxHp: 165,
          level: 50,
          moves: [{ id: 'stoneedge', name: 'Stone Edge' }]
        } as unknown as Pokemon
      ]
    } as unknown as BattleState;

    const mockState: GameState = {
      starterChosen: true,
      team: [{ uid: 'p-1', id: 'bulbasaur', level: 5, hp: 20, maxHp: 20 } as unknown as Pokemon],
      box: [],
      activeBattle
    } as unknown as GameState;

    const serialized = serializeState(mockState);
    const battle = serialized.activeBattle as Record<string, unknown> | null;
    expect(battle).not.toBeNull();
    expect(battle?.['isGym']).toBe(true);
    expect(battle?.['gymId']).toBe('pewter');
    expect(battle?.['trainerName']).toBe('Brock');
    expect((battle?.['enemyTeam'] as Array<{ hp: number }>)?.[0]?.hp).toBe(165);
  });

  it('should return null for activeBattle if there is no active battle', () => {
    const mockState: GameState = {
      starterChosen: true,
      team: [{ uid: 'p-1', id: 'bulbasaur', level: 5, hp: 20, maxHp: 20 } as unknown as Pokemon],
      box: [],
      activeBattle: null
    } as unknown as GameState;

    const serialized = serializeState(mockState);
    expect(serialized.activeBattle).toBeNull();
  });
});
