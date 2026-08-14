import { describe, it, expect } from 'vitest';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';

/**
 * Deterministic Replay Integration Test
 * Verifies turn-by-turn combat replay fidelity using self-contained frozen fixtures.
 * Does NOT depend on external fuzzer output files.
 */
describe('Deterministic Battle Replay Integration', () => {
  const DETERMINISTIC_REPLAY_CASE = {
    id: 'case-deterministic-replay-01',
    seed: [1, 2, 3, 4],
    playerTeam: [
      {
        name: 'Mew',
        species: 'Mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'synchronize',
        nature: 'adamant',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['closecombat', 'earthquake', 'psychic', 'surf'],
        uid: 'mew-player-uid-1',
        stats: { maxHp: 341, atk: 328, def: 236, spa: 212, spd: 236, spe: 299 }
      }
    ],
    enemyTeam: [
      {
        name: 'Blissey',
        species: 'Blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'naturalcure',
        nature: 'bold',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['softboiled', 'seismictoss', 'toxic', 'aromatherapy'],
        uid: 'blissey-enemy-uid-1',
        stats: { maxHp: 714, atk: 22, def: 130, spa: 186, spd: 307, spe: 146 }
      }
    ],
    history: [
      { p1Choice: 'move 1', p2Choice: 'move 2' },
      { p1Choice: 'move 1', p2Choice: 'move 2' }
    ],
    expectedWinner: 'Player'
  };

  it('replays deterministic turn-by-turn battle to clean completion with zero desyncs', () => {
    const testCase = DETERMINISTIC_REPLAY_CASE;
    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: testCase.seed as any });
    battle.setPlayer('p1', { name: 'Player', team: testCase.playerTeam as any });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: testCase.enemyTeam as any });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    for (let i = 0; i < testCase.history.length; i++) {
      const step = testCase.history[i]!;
      if (battle.ended) break;

      const result = executeBattleTurn({
        battle,
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        history: testCase.history as any,
        currentStep: i + 1,
        certifiedHistoryStep: step as any
      });

      expect(result).toBeDefined();
    }

    expect(battle.ended).toBe(true);
    expect(battle.winner).toBe(testCase.expectedWinner);
  });
});
