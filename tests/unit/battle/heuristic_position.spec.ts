import { describe, it, expect } from 'vitest';
import { evaluatePosition } from '@/logic/battle/ai/heuristic/position';
import type { HeuristicBattleSnapshot, WinCondition, HeuristicPokemonState } from '@/logic/battle/ai/heuristic/types';
import type { HeuristicDamageCalculator } from '@/logic/battle/ai/heuristic/damageCalculator';

describe('evaluatePosition', () => {
  const dummyCalc: HeuristicDamageCalculator = {
    getEffectiveSpeed: (p: HeuristicPokemonState) => (p.baseStats?.spe ?? 100),
    calcDamage: () => ({ maxPercent: 50, minPercent: 40 }),
  } as unknown as HeuristicDamageCalculator;

  function createEmptySnapshot(): HeuristicBattleSnapshot {
    return {
      myPlayer: 'p1',
      mySide: {
        pokemon: [],
        activePokemon: null,
        sideConditions: new Map(),
      },
      opponentSide: {
        pokemon: [],
        activePokemon: null,
        sideConditions: new Map(),
      },
      field: {} as any,
    } as unknown as HeuristicBattleSnapshot;
  }

  it('returns balanced score (0) when both sides are empty', () => {
    const snapshot = createEmptySnapshot();
    const result = evaluatePosition(snapshot, dummyCalc, []);

    expect(result.score).toBeCloseTo(-0.15, 2);
    expect(result.factors.pokemonAdvantage).toBe(0);
    expect(result.factors.hpAdvantage).toBe(0);
    expect(result.factors.hazardAdvantage).toBe(0);
    expect(result.factors.speedAdvantage).toBe(0);
    expect(result.factors.typeMatchupAdvantage).toBe(0);
    expect(result.factors.statusAdvantage).toBe(0);
    expect(result.factors.winConditionViability).toBe(-1);
  });

  it('calculates pokemon and hp advantage correctly', () => {
    const snapshot = createEmptySnapshot();
    snapshot.mySide.pokemon = [
      { fainted: false, hpPercent: 100, status: null, baseStats: { spe: 100 } } as any,
      { fainted: false, hpPercent: 80, status: null, baseStats: { spe: 80 } } as any,
    ];
    snapshot.opponentSide.pokemon = [
      { fainted: false, hpPercent: 50, status: null, baseStats: { spe: 70 } } as any,
    ];

    const result = evaluatePosition(snapshot, dummyCalc, []);
    // myAlive = 2, oppAlive = 1, total = 3 -> pokemonAdvantage = (2 - 1) / 3 = 0.333
    expect(result.factors.pokemonAdvantage).toBeCloseTo(1 / 3, 2);
    // myAvgHp = 90, oppAvgHp = 50 -> hpAdvantage = (90 - 50) / 100 = 0.40
    expect(result.factors.hpAdvantage).toBeCloseTo(0.40, 2);
    expect(result.score).toBeGreaterThan(0);
  });

  it('calculates hazard advantage when opponent has hazards set', () => {
    const snapshot = createEmptySnapshot();
    snapshot.opponentSide.sideConditions.set('stealthrock', 1);
    snapshot.opponentSide.sideConditions.set('spikes', 2);

    const result = evaluatePosition(snapshot, dummyCalc, []);
    // opp has 3 hazard layers, mySide has 0 -> hazardAdvantage = 3 / 5 = 0.60
    expect(result.factors.hazardAdvantage).toBeCloseTo(0.60, 2);
  });

  it('calculates status advantage when opponent pokemon have status conditions', () => {
    const snapshot = createEmptySnapshot();
    snapshot.mySide.pokemon = [
      { fainted: false, hpPercent: 100, status: null, baseStats: { spe: 100 } } as any,
    ];
    snapshot.opponentSide.pokemon = [
      { fainted: false, hpPercent: 100, status: 'brn', baseStats: { spe: 100 } } as any,
    ];

    const result = evaluatePosition(snapshot, dummyCalc, []);
    // opp has 1 statused, my has 0 -> (1 - 0) / 3 = 0.333
    expect(result.factors.statusAdvantage).toBeCloseTo(1 / 3, 2);
  });

  it('calculates win condition viability factor', () => {
    const snapshot = createEmptySnapshot();
    const winConditions: WinCondition[] = [
      { score: 0.8 } as WinCondition,
    ];

    const result = evaluatePosition(snapshot, dummyCalc, winConditions);
    // (0.8 - 0.5) * 2 = 0.6
    expect(result.factors.winConditionViability).toBeCloseTo(0.6, 2);
  });
});
