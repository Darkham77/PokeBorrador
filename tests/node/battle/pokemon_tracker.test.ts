import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { PokemonTracker } from '../../../src/logic/battle/ai/heuristic/pokemonTracker.ts';
import type { RandomBattleSetEntry } from '../../../src/logic/battle/ai/heuristic/types.ts';

describe('HeuristicAI - PokemonTracker Unit Tests', () => {
  let tracker: PokemonTracker;
  let mockSets: RandomBattleSetEntry[];

  beforeEach(() => {
    // 3 sets de prueba para un Pikachu ficticio
    mockSets = [
      {
        role: 'Physical Sweeper',
        ability: 'Static',
        item: 'Light Ball',
        moves: ['volttackle', 'extremespeed', 'irontail', 'fakeout']
      },
      {
        role: 'Special Attacker',
        ability: 'Lightning Rod',
        item: 'Life Orb',
        moves: ['thunderbolt', 'grassknot', 'surf', 'hiddenpower']
      },
      {
        role: 'Nasty Plot Utility',
        ability: 'Lightning Rod',
        item: 'Focus Sash',
        moves: ['nastyplot', 'thunderbolt', 'substitute', 'surf']
      }
    ];

    tracker = new PokemonTracker('pikachu', mockSets);
  });

  it('should initialize probabilities uniformly based on baseSets count', () => {
    const info = tracker.getInferredInfo();
    assert.strictEqual(info.possibleSets.length, 3);
    // Cada set debe tener una probabilidad de aproximadamente 0.333
    for (const set of info.possibleSets) {
      assert.ok(set.probability > 0.3 && set.probability < 0.34);
    }
  });

  it('should eliminate sets that do not contain the observed move', () => {
    // Observamos 'volttackle', que sólo pertenece al primer set
    tracker.observeMove('volttackle');

    const info = tracker.getInferredInfo();
    // Sólo el primer set debe ser posible ahora (probabilidad = 1.0)
    const validSets = info.possibleSets;
    assert.strictEqual(validSets.length, 1);
    assert.strictEqual(validSets[0]!.role, 'Physical Sweeper');
    assert.strictEqual(validSets[0]!.probability, 1.0);
  });

  it('should adjust item probability when Life Orb recoil is observed', () => {
    // Observamos retroceso por Life Orb (recoil)
    tracker.observeRecoil();

    const info = tracker.getInferredInfo();
    const sets = info.possibleSets;

    // El segundo set que lleva 'Life Orb' debe tener mayor probabilidad que los otros
    const specialAttackerSet = sets.find(s => s.role === 'Special Attacker')!;
    const otherSet = sets.find(s => s.role === 'Nasty Plot Utility')!;
    
    assert.ok(specialAttackerSet.probability > otherSet.probability);
  });

  it('should adjust item probability when Heavy-Duty Boots no-hazard damage is observed', () => {
    // Configuramos un set con Heavy-Duty Boots para probar
    mockSets[2]!.item = 'heavydutyboots';
    tracker = new PokemonTracker('pikachu', mockSets);

    // Observamos que no recibe daño por trampas de rocas
    tracker.observeNoHazardDamage();

    const info = tracker.getInferredInfo();
    const bootsSet = info.possibleSets.find(s => s.role === 'Nasty Plot Utility')!;
    const normalSet = info.possibleSets.find(s => s.role === 'Special Attacker')!;

    // El set con Heavy-Duty Boots debe ganar peso de probabilidad
    assert.ok(bootsSet.probability > normalSet.probability);
  });

  it('should fall back to uniform distribution if all sets are eliminated (Zero-Sets protection)', () => {
    // Observamos una combinación imposible de movimientos que ningún set tiene en común
    tracker.observeMove('volttackle');  // Descarta sets 2 y 3 (deja sólo el set 1)
    tracker.observeMove('thunderbolt'); // Thunderbolt no está en el set 1, esto descarta el set 1

    const info = tracker.getInferredInfo();
    // Protección Zero-Sets: Debe restablecer a los 3 sets originales con probabilidad uniforme
    assert.strictEqual(info.possibleSets.length, 3);
    for (const set of info.possibleSets) {
      assert.ok(set.probability > 0.3 && set.probability < 0.34);
    }
  });
});
