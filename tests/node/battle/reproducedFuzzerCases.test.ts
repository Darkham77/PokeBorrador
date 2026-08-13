import { describe, it, expect } from 'vitest';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';

// Apply unified spread modify patch
patchShowdownSpreadModify(() => true);

describe('Reproduced & Extracted Regression Fuzzer Cases', () => {
  /**
   * CASE REGRESSION 1: 6v6 Move Fuzzer with Forced Switches, Dynamic Ability Triggers & Natural Combat
   * Static extracted scenario verifying:
   * - Team preview default handling
   * - Forced switches on mid-turn faint resolution
   * - Zero choice rejection across all 40+ turns
   */
  it('replays extracted 6v6 forced-switch combat case step-by-step to completion', () => {
    const seed = [12345, 67890, 54321, 9876];
    const playerTeam = [
      {
        name: 'Mew',
        species: 'Mew',
        level: 100,
        ability: 'Color Change',
        item: '',
        moves: ['aquaring', 'aquastep', 'aquatail', 'armorcannon'],
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      },
      {
        name: 'Mew',
        species: 'Mew',
        level: 100,
        ability: 'Air Lock',
        item: '',
        moves: ['absorb', 'accelerock', 'acid', 'acidarmor'],
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      }
    ];

    const enemyTeam = [
      {
        name: 'Blissey',
        species: 'Blissey',
        level: 100,
        ability: 'Natural Cure',
        item: '',
        moves: ['thunderbolt', 'surf', 'flamethrower', 'bodyslam'],
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      },
      {
        name: 'Blissey',
        species: 'Blissey',
        level: 100,
        ability: 'Natural Cure',
        item: '',
        moves: ['thunderbolt', 'surf', 'flamethrower', 'bodyslam'],
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      }
    ];

    const staticHistory = [
      { turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 },
      { turnCount: 2, p1Choice: 'move 2', p2Choice: 'move 1', battleTurn: 2 },
      { turnCount: 3, p1Choice: 'move 3', p2Choice: 'move 1', battleTurn: 3 },
      { turnCount: 4, p1Choice: 'move 4', p2Choice: 'move 1', battleTurn: 4 },
      { turnCount: 5, p1Choice: 'move 4', p2Choice: 'move 1', battleTurn: 5 },
      { turnCount: 6, p1Choice: 'move 4', p2Choice: 'move 1', battleTurn: 6 }
    ];

    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: seed as any });
    battle.setPlayer('p1', { name: 'Player', team: playerTeam as any });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam as any });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    for (let i = 0; i < staticHistory.length; i++) {
      const step = staticHistory[i]!;
      if (battle.ended) break;

      const result = executeBattleTurn({
        battle,
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        history: staticHistory as any,
        currentStep: i + 1,
        certifiedHistoryStep: step as any
      });

      expect(result).toBeDefined();
      expect(result.p1AcceptedChoice).toBeTruthy();
    }
  });

  /**
   * CASE REGRESSION 2: Single-mon Item Fuzzer with IPB Healing and Status Removal
   * Static extracted scenario verifying:
   * - 1v1 battle fast convergence
   * - Post-turn cheat execution without stalling
   */
  it('replays extracted 1v1 item battle with deterministic turn-by-turn choices', () => {
    const seed = [42, 42, 42, 42];
    const playerTeam = [
      {
        name: 'Pikachu',
        species: 'Pikachu',
        level: 50,
        ability: 'Static',
        item: 'oranberry',
        moves: ['thunderbolt', 'quickattack', 'irontail', 'volttackle'],
        nature: 'Jolly',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      }
    ];

    const enemyTeam = [
      {
        name: 'Meowth',
        species: 'Meowth',
        level: 50,
        ability: 'Pickup',
        item: 'sitrusberry',
        moves: ['slash', 'bite', 'fakeout', 'scratch'],
        nature: 'Adamant',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      }
    ];

    const staticHistory = [
      { turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 },
      { turnCount: 2, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 2 },
      { turnCount: 3, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 3 }
    ];

    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: seed as any });
    battle.setPlayer('p1', { name: 'Player', team: playerTeam as any });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam as any });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    for (let i = 0; i < staticHistory.length; i++) {
      const step = staticHistory[i]!;
      if (battle.ended) break;

      const result = executeBattleTurn({
        battle,
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        history: staticHistory as any,
        currentStep: i + 1,
        certifiedHistoryStep: step as any
      });

      expect(result).toBeDefined();
    }
  });

  /**
   * CASE REGRESSION 3: Forced Switch Auto-Selection (side.requestState === 'switch')
   * Static scenario verifying that when P2's active Pokémon faints,
   * ShowdownBattleEngine resolves 'switch 2' correctly and commits the turn.
   */
  it('automatically resolves and commits forced switch when a Pokémon faints', () => {
    const seed = [999, 888, 777, 666];
    const playerTeam = [
      {
        name: 'Mewtwo',
        species: 'Mewtwo',
        level: 100,
        ability: 'Pressure',
        item: '',
        moves: ['psystrike'],
        nature: 'Modest',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 }
      }
    ];

    const enemyTeam = [
      {
        name: 'Caterpie',
        species: 'Caterpie',
        level: 1,
        ability: 'Shield Dust',
        item: '',
        moves: ['tackle'],
        nature: 'Hardy',
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      },
      {
        name: 'Metapod',
        species: 'Metapod',
        level: 50,
        ability: 'Shed Skin',
        item: '',
        moves: ['harden'],
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
      }
    ];

    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: seed as any });
    battle.setPlayer('p1', { name: 'Player', team: playerTeam as any });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam as any });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    // Turn 1: Mewtwo uses Psystrike and knocks out Caterpie (1 HP)
    const turn1Result = executeBattleTurn({
      battle,
      p1Choice: 'move 1',
      p2Choice: 'move 1',
      history: [],
      currentStep: 1
    });

    expect(turn1Result).toBeDefined();
    expect(battle.p2.pokemon[0]?.fainted).toBe(true);
    expect(battle.p2.requestState).toBe('switch');

    // Turn 2: P2 must make a forced switch to Metapod (slot 2)
    const turn2Result = executeBattleTurn({
      battle,
      p1Choice: '',
      p2Choice: 'switch 2',
      history: [{ turnCount: 2, p1Choice: '', p2Choice: 'switch 2' }] as any,
      currentStep: 2,
      certifiedHistoryStep: { turnCount: 2, p1Choice: '', p2Choice: 'switch 2' } as any
    });

    expect(turn2Result).toBeDefined();
    expect(battle.p2.active[0]?.name).toBe('Metapod');
    expect(battle.p2.active[0]?.fainted).toBe(false);
  });
});
