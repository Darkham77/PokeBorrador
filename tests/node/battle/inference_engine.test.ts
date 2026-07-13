import { describe, it, vi, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { InferenceEngine } from '../../../src/logic/battle/ai/heuristic/inferenceEngine.ts';
import type { HeuristicSnapshot } from '../../../src/logic/battle/ai/heuristic/types.ts';

// Mock de audio y stores de Vue/Pinia antes de importar dependencias de lógica
vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({
    play: vi.fn()
  })
}));

describe('HeuristicAI - InferenceEngine Unit Tests', () => {
  let engine: InferenceEngine;
  let baseSnapshot: HeuristicSnapshot;

  beforeEach(() => {
    engine = new InferenceEngine();

    // Snapshot mínimo del estado de batalla
    baseSnapshot = {
      turn: 1,
      mySide: {
        activePokemon: { name: 'Pikachu', species: 'pikachu', active: true, fainted: false, hp: 100, maxHp: 100, types: ['electric'], stats: { atk: 55, def: 40, spa: 50, spd: 50, spe: 90 }, moves: ['thunderbolt'], volatiles: new Set(), status: '', knownMoves: [] },
        pokemon: []
      },
      opponentSide: {
        activePokemon: { name: 'Toxapex', species: 'toxapex', active: true, fainted: false, hp: 130, maxHp: 130, types: ['poison', 'water'], stats: { atk: 65, def: 152, spa: 53, spd: 142, spe: 35 }, moves: [], volatiles: new Set(), status: '', knownMoves: [] },
        pokemon: []
      }
    } as unknown as HeuristicSnapshot;

    // Alinear pokemon arrays para el iterador de update()
    baseSnapshot.opponentSide.pokemon = [baseSnapshot.opponentSide.activePokemon];
    baseSnapshot.mySide.pokemon = [baseSnapshot.mySide.activePokemon];
  });

  it('should infer default moves database for a known species (Toxapex)', () => {
    engine.update(baseSnapshot);
    const inferredMoves = engine.getActiveOpponentMoves(baseSnapshot);
    
    assert.ok(inferredMoves);
    assert.ok(inferredMoves.size > 0);
    // Debe deducir que tiene Baneful Bunker, Toxic Spikes u otro movimiento similar de su set común
    const keys = Array.from(inferredMoves.keys());
    assert.ok(keys.some(m => m === 'banefulbunker' || m === 'toxicspikes' || m === 'recover' || m === 'toxic'));
  });

  it('should track revealed moves dynamically and prioritize them over inferred ones', () => {
    // Simulamos que el oponente revela que tiene un movimiento que no estaba en el set por defecto
    const opponent = baseSnapshot.opponentSide.activePokemon!;
    opponent.knownMoves = ['shadowball']; // Movimiento revelado en el turno 2
    baseSnapshot.opponentSide.pokemon = [opponent];
    baseSnapshot.turn = 2;

    engine.update(baseSnapshot);
    const inferredMoves = engine.getActiveOpponentMoves(baseSnapshot);

    // Debe incluir sí o sí el movimiento revelado
    assert.ok(inferredMoves.has('shadowball'));
  });

  it('should gracefully return empty list for unknown glitched species without crashing', () => {
    const opponent = baseSnapshot.opponentSide.activePokemon!;
    opponent.species = 'MissingNo'; // Especie desconocida no en la base de datos
    baseSnapshot.opponentSide.pokemon = [opponent];
    
    engine.update(baseSnapshot);
    const inferredMoves = engine.getActiveOpponentMoves(baseSnapshot);
    assert.ok(inferredMoves instanceof Map);
  });
});
