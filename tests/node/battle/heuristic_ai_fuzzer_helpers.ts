/**
 * tests/node/battle/heuristic_ai_fuzzer_helpers.ts
 * 
 * Mock factories and helper utilities for heuristic AI fuzzer test suite.
 */

import { heuristicDecision } from '../../../src/logic/battle/ai/heuristic/heuristicEngine.ts';
import type {
  HeuristicBattleSnapshot,
  HeuristicPokemonState,
  HeuristicPokemonMove,
  HeuristicMoveInfo,
  HeuristicFieldState,
  StrategicState,
  AIConfig,
} from '../../../src/logic/battle/ai/heuristic/types.ts';
import type { PokemonMoveId } from '../../../src/data/battle/moves.ts';

export function makeBoosts() {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
}

export function makeVolatiles(values: Iterable<HeuristicPokemonState['volatiles'] extends Set<infer T> ? T : never> = []) {
  return new Set(values);
}

export function makeMove(id: PokemonMoveId): HeuristicPokemonMove {
  return {
    id,
    name: id,
    type: 'normal',
    category: 'physical',
    basePower: 50,
    accuracy: 100,
    pp: 10,
    maxpp: 10,
    target: 'normal',
  };
}

export function makePoke(
  name: string,
  overrides: Partial<HeuristicPokemonState> = {},
): HeuristicPokemonState {
  return {
    name,
    species: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    level: 50,
    hp: 150,
    maxhp: 150,
    hpPercent: 100,
    status: null,
    active: true,
    fainted: false,
    types: ['normal'],
    baseStats: { hp: 150, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    stats: { hp: 150, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    moves: [makeMove('tackle'), makeMove('growl'), makeMove('thunderbolt'), makeMove('flamethrower')],
    knownMoves: [],
    ability: 'blaze',
    knownAbility: null,
    item: '',
    knownItem: null,
    itemConsumed: false,
    boosts: makeBoosts(),
    volatiles: makeVolatiles(),
    ...overrides,
  };
}

export function makeField(overrides: Partial<HeuristicFieldState> = {}): HeuristicFieldState {
  return {
    weather: null,
    terrain: null,
    trickRoom: false,
    tailwind: { p1: 0, p2: 0 },
    ...overrides,
  };
}

export function makeSnapshot(
  my: HeuristicPokemonState,
  opp: HeuristicPokemonState,
  bench: HeuristicPokemonState[] = [],
  field: HeuristicFieldState = makeField(),
): HeuristicBattleSnapshot {
  return {
    turn: 1,
    myPlayer: 'p2',
    mySide: {
      id: 'p2',
      pokemon: [my, ...bench],
      activePokemon: my,
      sideConditions: new Map(),
    },
    opponentSide: {
      id: 'p1',
      pokemon: [opp],
      activePokemon: opp,
      sideConditions: new Map(),
    },
    field,
  };
}

export function makeStrategic(): StrategicState {
  return {
    winConditions: [],
    threats: [],
    position: {
      score: 0,
      factors: {
        pokemonAdvantage: 0,
        hpAdvantage: 0,
        hazardAdvantage: 0,
        speedAdvantage: 0,
        typeMatchupAdvantage: 0,
        statusAdvantage: 0,
        winConditionViability: 0,
      },
    },
    sackOrder: [],
  };
}

export const MOVES_MIXED: HeuristicMoveInfo[] = [
  { id: 'swordsdance', pp: 20, disabled: false },
  { id: 'thunderbolt', pp: 15, disabled: false },
  { id: 'uturn', pp: 20, disabled: false },
  { id: 'stealthrock', pp: 20, disabled: false },
];

export function applyErrorRate(
  decision: ReturnType<typeof heuristicDecision>,
  available: HeuristicMoveInfo[],
  config: AIConfig,
): ReturnType<typeof heuristicDecision> {
  if (decision && Math.random() < config.errorRate) {
    const validMoves = available.filter(m => !m.disabled && m.pp > 0);
    if (validMoves.length === 0) return decision;
    const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
    if (!rand) return decision;
    return {
      type: 'move',
      moveId: rand.id,
      moveIndex: available.indexOf(rand) + 1,
      source: 'random',
      confidence: 0,
      reasoning: 'error-rate random',
    };
  }
  return decision;
}
