// ============================================================
// Heuristic AI — Internal Types
// Adapted from external/pokemon-showdown-ai/src/types.ts
// ============================================================

import type { BattleConditionKey } from '@/types/battle/battle';
import type { PokemonStatus } from '@/types/pokemon/pokemon';

export const HEURISTIC_VOLATILE_KEYS = [
  'choicelock',
  'confusion',
  'encore',
  'focusenergy',
  'ingrain',
  'leechseed',
  'mustrecharge',
  'protect',
  'rollout',
  'substitute',
  'taunt',
  'trapped',
] as const;
export type HeuristicVolatileKey = (typeof HEURISTIC_VOLATILE_KEYS)[number];

export interface HeuristicPokemonState {
  name: string;
  species: string;
  level: number;
  hp: number;
  maxHp: number;
  hpPercent: number;
  status: PokemonStatus;
  active: boolean;
  fainted: boolean;
  stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];       // all known move IDs
  knownMoves: string[];  // moves revealed in battle
  ability: string;
  knownAbility: string | null;
  item: string;          // mapped from pokemon.heldItem (canonical)
  knownItem: string | null;
  itemConsumed: boolean;
  boosts: { atk: number; def: number; spa: number; spd: number; spe: number; accuracy: number; evasion: number };
  volatiles: Set<HeuristicVolatileKey>;
}

export interface HeuristicSideState {
  id: 'p1' | 'p2';
  pokemon: HeuristicPokemonState[];
  activePokemon: HeuristicPokemonState | null;
  sideConditions: Map<BattleConditionKey, number>;
}

export interface HeuristicFieldState {
  weather: string | null;
  terrain: string | null;
  trickRoom: boolean;
  tailwind: { p1: number; p2: number };
}

export interface HeuristicBattleSnapshot {
  turn: number;
  myPlayer: 'p1' | 'p2';
  mySide: HeuristicSideState;
  opponentSide: HeuristicSideState;
  field: HeuristicFieldState;
}

export interface HeuristicMoveInfo {
  id: string;
  pp: number;
  disabled: boolean;
}

export type HeuristicDecisionType = 'move' | 'switch';
export type HeuristicDecisionSource = 'heuristic' | 'fallback' | 'random';

export interface HeuristicDecision {
  type: HeuristicDecisionType;
  moveId?: string;       // move ID (when type === 'move')
  moveIndex?: number;    // 1-based index into available moves
  switchTeamIndex?: number; // 0-based index into team array
  source: HeuristicDecisionSource;
  confidence: number;
  reasoning?: string;
}

// ============================================================
// Strategy types
// ============================================================

export interface WinCondition {
  pokemon: string;
  score: number;
  requiresSetup: boolean;
  threatsRemaining: string[];
}

export interface ThreatAssessment {
  pokemon: string;
  score: number;
  speedThreat: number;
  damageThreat: number;
  setupPotential: number;
  defensiveWallValue: number;
}

export interface PositionEvaluation {
  score: number; // -1.0 to +1.0
  factors: {
    pokemonAdvantage: number;
    hpAdvantage: number;
    hazardAdvantage: number;
    speedAdvantage: number;
    typeMatchupAdvantage: number;
    statusAdvantage: number;
    winConditionViability: number;
  };
}

export interface SackOrderEntry {
  pokemon: string;
  preservationScore: number;
}

export interface StrategicState {
  winConditions: WinCondition[];
  threats: ThreatAssessment[];
  position: PositionEvaluation;
  sackOrder: SackOrderEntry[];
}

// ============================================================
// Damage calculation types
// ============================================================

export interface DamageResult {
  move: string;
  attacker: string;
  defender: string;
  minPercent: number;
  maxPercent: number;
  isOHKO: boolean;
  is2HKO: boolean;
  priority: number;
}

export interface DamageMatchup {
  myAttacking: DamageResult[];
  oppAttacking: DamageResult[];
}

// ============================================================
// Inference types
// ============================================================

export interface RandomBattleSetEntry {
  moves: string[];
  ability: string;
  item: string;
  role: string;
}


export interface InferredSet extends RandomBattleSetEntry {
  probability: number;
}

export interface InferredInfo {
  pokemon: string;
  possibleSets: InferredSet[];
  likelyMoves: Map<string, number>;
  likelyAbility: Map<string, number>;
  likelyItem: Map<string, number>;
}

// ============================================================
// AI difficulty config
// ============================================================

export interface AIConfig {
  /** 0.0 = perfect play, 1.0 = fully random */
  errorRate: number;
  /** 0.0 = never switches, 1.0 = very aggressive switching */
  switchAggressiveness: number;
  /** Run full strategic evaluation (win conditions, threats, position) */
  useStrategicEval: boolean;
  /** Run inference engine (probabilistic set tracking) */
  useInference: boolean;
}

export const AI_CONFIG_PRESETS = {
  wild: {
    errorRate: 0.50,
    switchAggressiveness: 0.0,
    useStrategicEval: false,
    useInference: false,
  },
  npc: {
    errorRate: 0.05,
    switchAggressiveness: 0.4,
    useStrategicEval: true,
    useInference: true,
  },
  gym: {
    errorRate: 0.00,
    switchAggressiveness: 0.7,
    useStrategicEval: true,
    useInference: true,
  },
  rival: {
    errorRate: 0.00,
    switchAggressiveness: 0.9,
    useStrategicEval: true,
    useInference: true,
  },
} as const satisfies Record<string, AIConfig>;
