import { describe, it, vi, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { HeuristicAI } from '../../../src/logic/battle/ai/heuristicAI.ts';
import type { BattleContext } from '../../../src/types/battle/battleContext.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('HeuristicAI - Anti-Switch Loop & Safe Counter Logic', () => {
  let ai: HeuristicAI;

  beforeEach(() => {
    ai = new HeuristicAI();
  });

  describe('Stay and Fight when no safe counter exists', () => {
    it('should NOT switch if all bench Pokemon take lethal/heavy damage from opponent', () => {
      // Force Math.random to 0 so random check always passes
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0);

      const player = {
        uid: 'player-1',
        id: 'zapdos',
        name: 'Zapdos',
        species: 'zapdos',
        level: 50,
        hp: 100,
        maxHp: 100,
        atk: 90,
        def: 85,
        spa: 125,
        spd: 90,
        spe: 100,
        type: 'electric',
        moves: [
          { id: 'thunderbolt', name: 'Thunderbolt', power: 90, type: 'electric', cat: 'special', pp: 15, maxPp: 15 }
        ]
      } as unknown as Pokemon;

      // Enemy has a Water Ace on field (vulnerable to electric, deals < 30% to Zapdos)
      const enemyActive = {
        uid: 'enemy-ace',
        id: 'blastoise',
        name: 'Blastoise',
        species: 'blastoise',
        level: 50,
        hp: 100,
        maxHp: 100,
        atk: 83,
        def: 100,
        spa: 85,
        spd: 105,
        spe: 78,
        type: 'water',
        moves: [
          { id: 'watergun', name: 'Water Gun', power: 40, type: 'water', cat: 'special', pp: 25, maxPp: 25 }
        ]
      } as unknown as Pokemon;

      // Enemy bench has only frail/vulnerable Pokémon (e.g. Pidgey, Caterpie) that take huge damage and deal < 35%
      const enemyBench1 = {
        uid: 'enemy-pawn-1',
        id: 'pidgey',
        name: 'Pidgey',
        species: 'pidgey',
        level: 20,
        hp: 30,
        maxHp: 30,
        atk: 45,
        def: 40,
        spa: 35,
        spd: 35,
        spe: 56,
        type: 'normal',
        moves: [
          { id: 'tackle', name: 'Tackle', power: 40, type: 'normal', cat: 'physical', pp: 35, maxPp: 35 }
        ]
      } as unknown as Pokemon;

      const enemyBench2 = {
        uid: 'enemy-pawn-2',
        id: 'caterpie',
        name: 'Caterpie',
        species: 'caterpie',
        level: 20,
        hp: 30,
        maxHp: 30,
        atk: 30,
        def: 35,
        spa: 20,
        spd: 20,
        spe: 45,
        type: 'bug',
        moves: [
          { id: 'tackle', name: 'Tackle', power: 40, type: 'normal', cat: 'physical', pp: 35, maxPp: 35 }
        ]
      } as unknown as Pokemon;

      const enemyTeam = [enemyActive, enemyBench1, enemyBench2];

      const mockStore = {
        activeBattle: {
          value: {
            isTrainer: true,
            trainerArchetype: 'rival',
            enemy: enemyActive,
            player: player,
            enemyTeam: enemyTeam,
            playerTeam: [player],
            turnCount: 3,
            enemyRequest: {
              active: [{ moves: [{ id: 'watergun', pp: 25, disabled: false }] }],
              side: {
                pokemon: [
                  { ident: 'p2: Blastoise', details: 'Blastoise, L50', hp: 100, maxhp: 100, active: true, moves: ['watergun'] },
                  { ident: 'p2: Pidgey', details: 'Pidgey, L20', hp: 30, maxhp: 30, active: false, moves: ['tackle'] },
                  { ident: 'p2: Caterpie', details: 'Caterpie, L20', hp: 30, maxhp: 30, active: false, moves: ['tackle'] }
                ]
              }
            },
            playerRequest: {
              active: [{ moves: [{ id: 'thunderbolt', pp: 15, disabled: false }] }],
              side: {
                pokemon: [
                  { ident: 'p1: Zapdos', details: 'Zapdos, L50', hp: 100, maxhp: 100, active: true, moves: ['thunderbolt'] }
                ]
              }
            }
          }
        },
        playerStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
        enemyStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
        weather: { value: null }
      } as unknown as BattleContext;

      // Previously, Blastoise was threatened (>27.5% damage from Zapdos and Blastoise deals < 30% with Water Gun),
      // so shouldSwitch returned TRUE blindly without checking bench, sacrificing Pidgey/Caterpie.
      // With our fix, shouldSwitch MUST return false because neither Pidgey nor Caterpie is a safe counter!
      const shouldSwitch = ai.shouldSwitch(enemyActive, player, enemyTeam, mockStore);
      randomSpy.mockRestore();
      assert.strictEqual(shouldSwitch, false, 'AI should stay and fight instead of sacrificing bench mons without a counter');
    });
  });

  describe('Anti-Ping-Pong Cooldown', () => {
    it('should respect switchCooldownTurns before allowing another voluntary switch', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0);

      const player = {
        uid: 'player-1',
        id: 'venusaur',
        name: 'Venusaur',
        species: 'venusaur',
        level: 50,
        hp: 100,
        maxHp: 100,
        atk: 82,
        def: 83,
        spa: 100,
        spd: 100,
        spe: 80,
        type: 'grass',
        moves: [{ id: 'solarbeam', name: 'Solar Beam', power: 120, type: 'grass', cat: 'special', pp: 10, maxPp: 10 }]
      } as unknown as Pokemon;

      // Enemy has a Water mon that was JUST sent in (turn 0)
      const enemyActive = {
        uid: 'enemy-water',
        id: 'vaporeon',
        name: 'Vaporeon',
        species: 'vaporeon',
        level: 50,
        hp: 100,
        maxHp: 100,
        atk: 65,
        def: 60,
        spa: 110,
        spd: 95,
        spe: 65,
        type: 'water',
        moves: [{ id: 'watergun', name: 'Water Gun', power: 40, type: 'water', cat: 'special', pp: 25, maxPp: 25 }]
      } as unknown as Pokemon;

      // Bench has a Fire counter (Charizard)
      const enemyBenchFire = {
        uid: 'enemy-fire',
        id: 'charizard',
        name: 'Charizard',
        species: 'charizard',
        level: 50,
        hp: 100,
        maxHp: 100,
        atk: 84,
        def: 78,
        spa: 109,
        spd: 85,
        spe: 100,
        type: 'fire',
        moves: [{ id: 'flamethrower', name: 'Flamethrower', power: 90, type: 'fire', cat: 'special', pp: 15, maxPp: 15 }]
      } as unknown as Pokemon;

      const enemyTeam = [enemyActive, enemyBenchFire];

      const mockStore = {
        activeBattle: {
          value: {
            isTrainer: true,
            trainerArchetype: 'cientifico', // tactical tier: cooldown is 2 turns
            enemy: enemyActive,
            player: player,
            enemyTeam: enemyTeam,
            playerTeam: [player],
            turnCount: 2,
            enemyRequest: {
              active: [{ moves: [{ id: 'watergun', pp: 25, disabled: false }] }],
              side: {
                pokemon: [
                  { ident: 'p2: Vaporeon', details: 'Vaporeon, L50', hp: 100, maxhp: 100, active: true, moves: ['watergun'] },
                  { ident: 'p2: Charizard', details: 'Charizard, L50', hp: 100, maxhp: 100, active: false, moves: ['flamethrower'] }
                ]
              }
            },
            playerRequest: {
              active: [{ moves: [{ id: 'solarbeam', pp: 10, disabled: false }] }],
              side: {
                pokemon: [
                  { ident: 'p1: Venusaur', details: 'Venusaur, L50', hp: 100, maxhp: 100, active: true, moves: ['solarbeam'] }
                ]
              }
            }
          }
        },
        playerStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
        enemyStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
        weather: { value: null }
      } as unknown as BattleContext;

      // On turn 1 of being active (activeTurns < 2), voluntary switch is blocked by cooldown
      ai.notifyTurnAdvanced?.('enemy-water'); // turn 1
      const switchAttemptTurn1 = ai.shouldSwitch(enemyActive, player, enemyTeam, mockStore);
      randomSpy.mockRestore();
      assert.strictEqual(switchAttemptTurn1, false, 'Turn 1 switch should be blocked by anti-ping-pong cooldown');
    });
  });
});
