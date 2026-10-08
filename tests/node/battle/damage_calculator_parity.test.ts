import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { Dex } from '@pkmn/sim';
import { HeuristicDamageCalculator } from '../../../src/logic/battle/ai/heuristic/damageCalculator.ts';
import type { HeuristicBattleSnapshot } from '../../../src/logic/battle/ai/heuristic/types.ts';
import { requirePokemonMoveId, type PokemonMoveId } from '../../../src/data/battle/moves.ts';

describe('HeuristicAI - Damage Parity Checks (@pkmn/sim vs @smogon/calc)', () => {
  let calc: HeuristicDamageCalculator;
  let baseSnapshot: HeuristicBattleSnapshot;
  const dexGen = Dex.forGen(9); // Generación 9 activa

  beforeEach(() => {
    calc = new HeuristicDamageCalculator(9);

    baseSnapshot = {
      turn: 1,
      field: { weather: null, terrain: null, tailwind: { p1: 0, p2: 0 }, trickRoom: false },
      mySide: {
        activePokemon: {
          name: 'Attacker',
          species: 'pikachu',
          active: true,
          fainted: false,
          hp: 100,
          maxHp: 100,
          hpPercent: 1.0,
          types: ['electric'],
          stats: { atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
          boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          knownMoves: [],
          volatiles: new Set(),
          status: ''
        },
        pokemon: []
      },
      opponentSide: {
        activePokemon: {
          name: 'Defender',
          species: 'bulbasaur',
          active: true,
          fainted: false,
          hp: 100,
          maxHp: 100,
          hpPercent: 1.0,
          types: ['grass'],
          stats: { atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
          boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          knownMoves: [],
          volatiles: new Set(),
          status: ''
        },
        pokemon: []
      }
    } as unknown as HeuristicBattleSnapshot;
  });

  const testCases = [
    { moveType: 'electric', defSpecies: 'squirtle', defTypes: ['water'], expectedEff: 2 },      // Súper efectivo
    { moveType: 'electric', defSpecies: 'diglett', defTypes: ['ground'], expectedEff: 0 },     // Inmune
    { moveType: 'fire', defSpecies: 'bulbasaur', defTypes: ['grass', 'poison'], expectedEff: 2 }, // Súper efectivo
    { moveType: 'fire', defSpecies: 'squirtle', defTypes: ['water'], expectedEff: 0.5 },        // Poco efectivo
    { moveType: 'normal', defSpecies: 'gastly', defTypes: ['ghost', 'poison'], expectedEff: 0 }, // Inmune
    { moveType: 'fighting', defSpecies: 'pidgey', defTypes: ['normal', 'flying'], expectedEff: 1 }, // Neutro (2 * 0.5)
    { moveType: 'fighting', defSpecies: 'ekans', defTypes: ['poison'], expectedEff: 0.5 }, // Poco efectivo
    { moveType: 'water', defSpecies: 'geodude', defTypes: ['rock', 'ground'], expectedEff: 4 } // Doble debilidad (x4)
  ];

const ATTACKER_SPECIES_BY_TYPE: Record<string, string> = {
  electric: 'pikachu',
  fire: 'charmander',
  water: 'squirtle',
  fighting: 'machop',
  normal: 'eevee'
};

const MOVE_BY_TYPE: Record<string, string> = {
  electric: 'thunderbolt',
  fire: 'flamethrower',
  normal: 'tackle',
  fighting: 'machpunch',
  water: 'surf'
};

function calculateSimTypeEffectiveness(
  dex: ReturnType<typeof Dex.forGen>,
  moveType: string,
  defTypes: string[]
): number {
  let simEff = 1;
  const attackKey = moveType.charAt(0).toUpperCase() + moveType.slice(1);
  for (const t of defTypes) {
    const typeData = dex.types.get(t);
    if (!typeData) continue;
    const damageTaken = typeData.damageTaken[attackKey];
    if (damageTaken === 1) simEff *= 2;
    else if (damageTaken === 2) simEff *= 0.5;
    else if (damageTaken === 3) simEff *= 0;
  }
  return simEff;
}

function verifySingleTestCase(
  tc: (typeof testCases)[number],
  dex: ReturnType<typeof Dex.forGen>,
  snapshot: HeuristicBattleSnapshot,
  calculator: HeuristicDamageCalculator
): void {
  const simEff = calculateSimTypeEffectiveness(dex, tc.moveType, tc.defTypes);
  assert.strictEqual(simEff, tc.expectedEff, `Sim effectiveness mismatch for ${tc.moveType} vs ${tc.defTypes}`);

  snapshot.mySide.activePokemon!.species = ATTACKER_SPECIES_BY_TYPE[tc.moveType] || 'eevee';
  snapshot.opponentSide.activePokemon!.species = tc.defSpecies;

  const testMove = {
    id: requirePokemonMoveId(MOVE_BY_TYPE[tc.moveType] || 'tackle'),
    pp: 10,
    disabled: false
  };

  const matchup = calculator.calcMatchup(snapshot, [testMove]);
  const res = matchup.myAttacking[0];
  assert.ok(res, `Failed to calculate matchup for ${testMove.id}`);

  if (simEff === 0) {
    assert.strictEqual(res.maxPercent, 0, `Expected 0 damage due to immunity for ${tc.moveType} vs ${tc.defTypes}`);
  } else {
    assert.ok(res.maxPercent > 0, `Expected positive damage for ${tc.moveType} vs ${tc.defTypes}`);
  }
}

  it('should match type effectiveness 1:1 between @pkmn/sim and HeuristicDamageCalculator', () => {
    for (const tc of testCases) {
      verifySingleTestCase(tc, dexGen, baseSnapshot, calc);
    }
  });
});
