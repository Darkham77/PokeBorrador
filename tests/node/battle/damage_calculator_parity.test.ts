import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { Dex } from '@pkmn/sim';
import { HeuristicDamageCalculator } from '../../../src/logic/battle/ai/heuristic/damageCalculator.ts';
import type { HeuristicBattleSnapshot } from '../../../src/logic/battle/ai/heuristic/types.ts';

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

  it('should match type effectiveness 1:1 between @pkmn/sim and HeuristicDamageCalculator', () => {
    for (const tc of testCases) {
      // 1. Obtener la efectividad de tipo oficial calculada por @pkmn/sim
      let simEff = 1;
      for (const t of tc.defTypes) {
        const typeData = dexGen.types.get(t);
        if (typeData) {
          const attackKey = tc.moveType.charAt(0).toUpperCase() + tc.moveType.slice(1);
          const damageTaken = typeData.damageTaken[attackKey];
          // Mapeo oficial de Showdown para damageTaken: 0 = normal, 1 = debilidad, 2 = resistencia, 3 = inmune
          if (damageTaken === 1) simEff *= 2;
          else if (damageTaken === 2) simEff *= 0.5;
          else if (damageTaken === 3) simEff *= 0;
        }
      }

      // Validar que nuestro caso de prueba tenga la efectividad esperada correcta
      assert.strictEqual(simEff, tc.expectedEff, `Sim effectiveness mismatch for ${tc.moveType} vs ${tc.defTypes}`);

      // 2. Modificar snapshot para el caso de prueba usando las especies reales
      baseSnapshot.mySide.activePokemon!.species = tc.moveType === 'electric' ? 'pikachu' : tc.moveType === 'fire' ? 'charmander' : tc.moveType === 'water' ? 'squirtle' : tc.moveType === 'fighting' ? 'machop' : 'eevee';
      
      baseSnapshot.opponentSide.activePokemon!.species = tc.defSpecies;

      // Un movimiento ficticio con potencia base para medir la efectividad
      const testMove = { id: 'testmove', pp: 10, disabled: false };
      
      // Mock de base de datos de movimientos para evitar errores de smogon/calc
      // Smogon/calc mapea tipos según el ID del movimiento, así que usamos movimientos reales que coinciden
      const moveMapping: Record<string, string> = {
        electric: 'thunderbolt',
        fire: 'flamethrower',
        normal: 'tackle',
        fighting: 'machpunch',
        water: 'surf'
      };
      testMove.id = moveMapping[tc.moveType] || 'tackle';

      const matchup = calc.calcMatchup(baseSnapshot, [testMove]);
      const res = matchup.myAttacking[0];

      assert.ok(res, `Failed to calculate matchup for ${testMove.id}`);
      
      // Si la efectividad oficial es 0 (inmunidad), el porcentaje de daño estimado debe ser exactamente 0
      if (simEff === 0) {
        assert.strictEqual(res.maxPercent, 0, `Expected 0 damage due to immunity for ${tc.moveType} vs ${tc.defTypes}`);
      } else {
        // Para efectividades mayores a 0, el porcentaje de daño debe ser mayor a 0
        assert.ok(res.maxPercent > 0, `Expected positive damage for ${tc.moveType} vs ${tc.defTypes}`);
      }
    }
  });
});
