import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { HeuristicDamageCalculator } from '../../../src/logic/battle/ai/heuristic/damageCalculator.ts';
import type { HeuristicBattleSnapshot } from '../../../src/logic/battle/ai/heuristic/types.ts';

describe('HeuristicAI - HeuristicDamageCalculator Unit Tests', () => {
  let calc: HeuristicDamageCalculator;
  let snapshot: HeuristicBattleSnapshot;

  beforeEach(() => {
    calc = new HeuristicDamageCalculator();

    snapshot = {
      turn: 1,
      field: {
        weather: null,
        terrain: null,
        tailwind: { p1: 0, p2: 0 },
        trickRoom: false
      },
      mySide: {
        activePokemon: {
          name: 'Pikachu',
          species: 'pikachu',
          active: true,
          fainted: false,
          hp: 100,
          maxHp: 100,
          hpPercent: 1.0,
          types: ['electric'],
          stats: { atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
          boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          knownMoves: ['thunderbolt'],
          volatiles: new Set(),
          status: ''
        },
        pokemon: []
      },
      opponentSide: {
        activePokemon: {
          name: 'Squirtle',
          species: 'squirtle',
          active: true,
          fainted: false,
          hp: 100,
          maxHp: 100,
          hpPercent: 1.0,
          types: ['water'],
          stats: { atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
          boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          knownMoves: ['watergun'],
          volatiles: new Set(),
          status: ''
        },
        pokemon: []
      }
    } as unknown as HeuristicBattleSnapshot;
  });

  it('should calculate matchup damage correctly prioritizing type effectiveness', () => {
    const validMoves = [{ id: 'thunderbolt', pp: 15, disabled: false }];
    const inferredMoves = ['watergun'];

    const matchup = calc.calcMatchup(snapshot, validMoves, inferredMoves);

    assert.ok(matchup.myAttacking);
    assert.ok(matchup.myAttacking.length > 0);

    const bestMove = matchup.myAttacking[0]!;
    assert.strictEqual(bestMove.move, 'thunderbolt');
    // Thunderbolt es eléctrico contra Squirtle (agua), debe ser súper efectivo (x2 daño)
    assert.ok(bestMove.maxPercent > 30);
  });

  it('should correctly handle complete type immunity (e.g. Ground immune to Electric)', () => {
    const opp = snapshot.opponentSide.activePokemon!;
    opp.types = ['ground']; // Squirtle muta a Tierra
    opp.species = 'diglett';

    const validMoves = [{ id: 'thunderbolt', pp: 15, disabled: false }];
    const inferredMoves = ['mudslap'];

    const matchup = calc.calcMatchup(snapshot, validMoves, inferredMoves);
    const bestMove = matchup.myAttacking[0]!;

    // Thunderbolt eléctrico contra tipo Tierra debe dar 0% de daño (inmunidad absoluta)
    assert.strictEqual(bestMove.maxPercent, 0);
  });

  it('should apply STAB modifiers when move matches attacker type', () => {
    const validMoves = [
      { id: 'thunderbolt', pp: 15, disabled: false }, // Electric (STAB)
      { id: 'quickattack', pp: 30, disabled: false }   // Normal (no STAB)
    ];

    const matchup = calc.calcMatchup(snapshot, validMoves);
    const tboltResult = matchup.myAttacking.find(m => m.move === 'thunderbolt')!;
    const quickResult = matchup.myAttacking.find(m => m.move === 'quickattack')!;

    // Debido al STAB y potencia base, Thunderbolt debe tener una estimación significativamente mayor
    assert.ok(tboltResult.maxPercent > quickResult.maxPercent);
  });
});
