import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';
import type { BattleState } from '@/types/battle/battle.ts';
import type { BattleContext } from '@/types/battle/battleContext.ts';
import { processEnemyFaintSequence } from '@/logic/battle/battleFaintSequence.ts';
import { registerRewardCombatant } from '@/logic/battle/rewardsDistributor.ts';

function createMockEnemy(uid: string, species: string, level = 20): Pokemon {
  return {
    uid,
    id: species,
    name: species.toUpperCase(),
    level,
    hp: 0,
    maxHp: 50,
    moves: [],
    types: ['water'],
    fainted: false
  } as unknown as Pokemon;
}

function createMockPlayer(uid: string, species: string, level = 50): Pokemon {
  return {
    uid,
    id: species,
    name: species.toUpperCase(),
    level,
    hp: 100,
    maxHp: 100,
    exp: 0,
    expNeeded: 1000,
    moves: [],
    types: ['electric'],
    fainted: false
  } as unknown as Pokemon;
}

describe('Reward Combatant Registration and Faint Sequence Parity', () => {
  it('registers defeated enemy in _rewardCombatants when enemy faints in a wild battle', async () => {
    const player = createMockPlayer('p1', 'pikachu', 50);
    const enemy = createMockEnemy('e1', 'magikarp', 20);

    const activeBattle: Partial<BattleState> = {
      player,
      enemy,
      _initialEnemy: enemy,
      _initialEnemies: { [enemy.uid]: enemy },
      _rewardCombatants: [],
      isTrainer: false,
      isGym: false,
      isPvP: false,
      over: false,
      participants: [player.uid],
      locationId: 'route22'
    };

    const mockCtx: Partial<BattleContext> = {
      activeBattle: ref(activeBattle as BattleState),
      fsm: {
        currentState: { value: 'ACTIVE_BATTLE' },
        currentSubState: { value: 'WAIT_INPUT' },
        transition: vi.fn().mockResolvedValue(undefined)
      } as unknown as BattleContext['fsm'],
      faintedSides: ref(new Set<string>()),
      addLog: vi.fn(),
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' } as unknown as BattleContext['BATTLE_STATES'],
      BATTLE_SUBSTATES: {
        ENEMY_REPLACEMENT_SEQ: 'ENEMY_REPLACEMENT_SEQ',
        TYPE_CHECK: 'TYPE_CHECK',
        ENEMY_DEFEAT: 'ENEMY_DEFEAT',
        PLAY_ENEMY_FAINT: 'PLAY_ENEMY_FAINT',
        CLEANUP_MEMORY: 'CLEANUP_MEMORY',
        VACATE_SEAT: 'VACATE_SEAT',
        CHECK_REMAINING: 'CHECK_REMAINING'
      } as unknown as BattleContext['BATTLE_SUBSTATES'],
      gs: {
        state: { team: [player] }
      } as unknown as BattleContext['gs']
    };

    let terminated = false;
    await processEnemyFaintSequence(mockCtx as BattleContext, enemy, {
      processFaint: vi.fn().mockResolvedValue(undefined),
      terminateBattle: vi.fn().mockImplementation(async () => {
        terminated = true;
      })
    });

    expect(terminated).toBe(true);
    // The defeated enemy MUST be registered in _rewardCombatants so battle rewards (XP, EVs) can be awarded
    expect(activeBattle._rewardCombatants).toBeDefined();
    expect(activeBattle._rewardCombatants!.length).toBeGreaterThan(0);
    expect(activeBattle._rewardCombatants![0]?.uid).toBe(enemy.uid);
  });

  it('allows registering a specific defeated Pokémon directly in registerRewardCombatant', () => {
    const enemy1 = createMockEnemy('e1', 'magikarp', 20);
    const activeBattle: Partial<BattleState> = {
      enemy: null,
      _initialEnemy: null,
      _rewardCombatants: []
    };

    // When active.enemy is already null, passing defeatedPokemon ensures it is registered
    registerRewardCombatant(activeBattle as BattleState, enemy1);

    expect(activeBattle._rewardCombatants).toHaveLength(1);
    expect(activeBattle._rewardCombatants![0]?.uid).toBe(enemy1.uid);
  });
});
