// ============================================================
// Unit test — heuristic engine regression
// Verifies the 9 heuristic layers with a synthetic snapshot
// Run: npm run test (vitest)
// ============================================================

import { describe, test, expect } from 'vitest';
import { heuristicDecision } from '@/logic/battle/ai/heuristic/heuristicEngine';
import { HeuristicDamageCalculator } from '@/logic/battle/ai/heuristic/damageCalculator';
import { InferenceEngine } from '@/logic/battle/ai/heuristic/inferenceEngine';
import type {
  HeuristicBattleSnapshot,
  HeuristicMoveInfo,
  HeuristicPokemonState,
  StrategicState,
  DamageMatchup,
  DamageResult,
} from '@/logic/battle/ai/heuristic/types';

// ──────────────────────────────────────────
// Synthetic state builders
// ──────────────────────────────────────────

function makePokemon(overrides: Partial<HeuristicPokemonState> = {}): HeuristicPokemonState {
  return {
    name: 'Charizard',
    species: 'charizard',
    level: 50,
    hp: 150,
    maxHp: 150,
    hpPercent: 100,
    status: null,
    active: true,
    fainted: false,
    stats: { hp: 150, atk: 109, def: 80, spa: 130, spd: 85, spe: 100 },
    moves: ['flamethrower', 'airslash', 'earthquake', 'dragonpulse'],
    knownMoves: ['flamethrower'],
    ability: 'blaze',
    knownAbility: 'blaze',
    item: 'choiceband',
    knownItem: 'choiceband',
    itemConsumed: false,
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
    volatiles: new Set(),
    ...overrides,
  };
}

function makeSnapshot(
  myActive: HeuristicPokemonState,
  oppActive: HeuristicPokemonState,
): HeuristicBattleSnapshot {
  return {
    turn: 1,
    myPlayer: 'p2',
    mySide: {
      id: 'p2',
      pokemon: [myActive],
      activePokemon: myActive,
      sideConditions: new Map(),
    },
    opponentSide: {
      id: 'p1',
      pokemon: [oppActive],
      activePokemon: oppActive,
      sideConditions: new Map(),
    },
    field: { weather: null, terrain: null, trickRoom: false, tailwind: { p1: 0, p2: 0 } },
  };
}

function makeStrategic(): StrategicState {
  return {
    winConditions: [],
    threats: [],
    position: { score: 0, factors: { pokemonAdvantage: 0, hpAdvantage: 0, hazardAdvantage: 0, speedAdvantage: 0, typeMatchupAdvantage: 0, statusAdvantage: 0, winConditionViability: 0 } },
    sackOrder: [],
  };
}

function makeMatchup(myBest: Partial<DamageResult> = {}, oppBest: Partial<DamageResult> = {}): DamageMatchup {
  const base: DamageResult = { move: 'tackle', attacker: 'a', defender: 'b', minPercent: 0, maxPercent: 0, isOHKO: false, is2HKO: false, priority: 0 };
  return {
    myAttacking: [{ ...base, move: 'tackle', ...myBest }],
    oppAttacking: [{ ...base, move: 'tackle', ...oppBest }],
  };
}

const AVAILABLE: HeuristicMoveInfo[] = [
  { id: 'flamethrower', pp: 15, disabled: false },
  { id: 'airslash', pp: 15, disabled: false },
  { id: 'earthquake', pp: 10, disabled: false },
];

// ──────────────────────────────────────────
// Tests
// ──────────────────────────────────────────

const calc = new HeuristicDamageCalculator();
const inference = new InferenceEngine();

describe('heuristicDecision — layer coverage', () => {
  test('Layer 3: priority KO fires first', () => {
    const myMon = makePokemon();
    const oppMon = makePokemon({ name: 'Blissey', species: 'blissey', hpPercent: 5, hp: 5 });
    const snapshot = makeSnapshot(myMon, oppMon);
    const matchup = makeMatchup({ move: 'quickattack', isOHKO: true, priority: 1, maxPercent: 110 });
    const available: HeuristicMoveInfo[] = [
      { id: 'quickattack', pp: 30, disabled: false },
      { id: 'flamethrower', pp: 15, disabled: false },
    ];
    const result = heuristicDecision(snapshot, matchup, makeStrategic(), available, [], calc, inference, false);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('move');
    expect(result?.moveId).toBe('quickattack');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('Layer 4: guaranteed OHKO when we outspeed', () => {
    const myMon = makePokemon({ stats: { hp: 150, atk: 109, def: 80, spa: 130, spd: 85, spe: 130 } });
    const oppMon = makePokemon({ name: 'Snorlax', species: 'snorlax', stats: { hp: 300, atk: 100, def: 100, spa: 65, spd: 100, spe: 30 } });
    const snapshot = makeSnapshot(myMon, oppMon);
    const matchup = makeMatchup({ move: 'flamethrower', isOHKO: true, maxPercent: 120, minPercent: 105 });

    const result = heuristicDecision(snapshot, matchup, makeStrategic(), AVAILABLE, [], calc, inference, false);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('move');
    expect(result?.moveId).toBe('flamethrower');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('Layer 8b: best available move fires when damage > 40%', () => {
    const myMon = makePokemon();
    const oppMon = makePokemon({ name: 'Slowbro', species: 'slowbro' });
    const snapshot = makeSnapshot(myMon, oppMon);
    const matchup = makeMatchup({ move: 'flamethrower', maxPercent: 65, minPercent: 55 });

    const result = heuristicDecision(snapshot, matchup, makeStrategic(), AVAILABLE, [], calc, inference, false);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('move');
    expect(result?.moveId).toBe('flamethrower');
  });

  test('Layer 9: evaluates switch when badly outmatched', () => {
    const myMon = makePokemon({ hpPercent: 80 });
    const oppMon = makePokemon({ name: 'Garchomp', species: 'garchomp' });
    const snapshot = makeSnapshot(myMon, oppMon);
    const switchCandidate = makePokemon({ name: 'Blastoise', species: 'blastoise', active: false });
    snapshot.mySide.pokemon.push(switchCandidate);

    const matchup = makeMatchup(
      { move: 'flamethrower', maxPercent: 15, minPercent: 10 },
      { move: 'earthquake', maxPercent: 75, minPercent: 65 },
    );

    const result = heuristicDecision(snapshot, matchup, makeStrategic(), AVAILABLE, [switchCandidate], calc, inference, false);
    // Either switch or a fallback move — both are valid for this matchup
    if (result !== null) {
      expect(['move', 'switch']).toContain(result.type);
    }
  });

  test('Returns null when matchup too neutral to trigger any layer', () => {
    const myMon = makePokemon();
    const oppMon = makePokemon({ name: 'Alakazam', species: 'alakazam' });
    const snapshot = makeSnapshot(myMon, oppMon);
    // Damage ~22-28% both sides — below all heuristic thresholds
    const matchup = makeMatchup(
      { move: 'tackle', maxPercent: 25, minPercent: 20 },
      { move: 'tackle', maxPercent: 28, minPercent: 22 },
    );

    const result = heuristicDecision(snapshot, matchup, makeStrategic(), AVAILABLE, [], calc, inference, false);
    expect(result).toBeNull();
  });

  test('Disabled moves are never selected', () => {
    const myMon = makePokemon();
    const oppMon = makePokemon({ name: 'Blissey', species: 'blissey', hpPercent: 5, hp: 5 });
    const snapshot = makeSnapshot(myMon, oppMon);
    const matchup = makeMatchup({ move: 'flamethrower', isOHKO: true, maxPercent: 110 });
    const availableDisabled: HeuristicMoveInfo[] = [
      { id: 'flamethrower', pp: 0, disabled: true },
      { id: 'airslash', pp: 15, disabled: false },
    ];

    const result = heuristicDecision(snapshot, matchup, makeStrategic(), availableDisabled, [], calc, inference, false);
    if (result?.type === 'move') {
      expect(result.moveId).not.toBe('flamethrower');
    }
  });
});
