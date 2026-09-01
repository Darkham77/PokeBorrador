import { describe, it, expect } from 'vitest';
import {
  evaluatePriorityKOLayer,
  evaluateGuaranteedKOLayer
} from '@/logic/battle/ai/heuristic/heuristicLayerEvaluators';
import type {
  DamageMatchup,
  HeuristicMoveInfo,
  HeuristicPokemonState,
} from '@/logic/battle/ai/heuristic/types';

describe('heuristicLayerEvaluators', () => {
  const dummyOppActive = {
    name: 'Charizard',
    species: 'charizard',
    hpPercent: 20,
  } as unknown as HeuristicPokemonState;

  const availableMoves: HeuristicMoveInfo[] = [
    { id: 'quickattack', pp: 20, disabled: false },
    { id: 'thunderbolt', pp: 15, disabled: false },
  ];

  it('selects priority KO move when opponent can be OHKOed by priority', () => {
    const matchup: DamageMatchup = {
      myAttacking: [
        {
          move: 'quickattack',
          attacker: 'pikachu',
          defender: 'charizard',
          minPercent: 30,
          maxPercent: 40,
          isOHKO: true,
          is2HKO: true,
          priority: 1
        },
      ],
      oppAttacking: [],
    };

    const decision = evaluatePriorityKOLayer(matchup, availableMoves, 100, 90, dummyOppActive);
    expect(decision).not.toBeNull();
    expect(decision?.type).toBe('move');
    expect(decision?.moveId).toBe('quickattack');
  });

  it('selects guaranteed OHKO move when outspeeding', () => {
    const matchup: DamageMatchup = {
      myAttacking: [
        {
          move: 'thunderbolt',
          attacker: 'pikachu',
          defender: 'charizard',
          minPercent: 110,
          maxPercent: 130,
          isOHKO: true,
          is2HKO: true,
          priority: 0
        },
      ],
      oppAttacking: [],
    };

    const decision = evaluateGuaranteedKOLayer(matchup, availableMoves, true);
    expect(decision).not.toBeNull();
    expect(decision?.type).toBe('move');
    expect(decision?.moveId).toBe('thunderbolt');
  });
});
