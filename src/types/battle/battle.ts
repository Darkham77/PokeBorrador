import { Pokemon } from '@/types/pokemon/pokemon';


export interface BattleStages {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  acc: number;
  eva: number;
  reflect: number;
  lightScreen: number;
  safeguard: number;
  mist: number;
  spikes: number;
  [key: string]: number | undefined;
}

export interface BattleWeather {
  type: string;
  visual?: string;
  turns: number;
}

export interface BattleState {
  player: Pokemon | null;
  enemy: Pokemon | null;
  playerTeamIndex: number;
  participants: string[];
  locationId: string;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  isTrainer: boolean;
  trainerName?: string;
  trainerSprite?: string;
  trainerArchetype?: string;
  isGym?: boolean;
  gymId?: string;
  weather: BattleWeather;
  turnCount: number;
  over: boolean;
  fled?: boolean;
  turn?: 'player' | 'enemy' | null;
  isCapture?: boolean;
  isRival?: boolean;
  escapeAttempts: number;
  rarity?: number;
  futureSightTurns?: number;
  futureSightTarget?: Pokemon | null;
  playerSideConditions?: Record<string, { turns: number; [key: string]: unknown }>;
  enemySideConditions?: Record<string, { turns: number; [key: string]: unknown }>;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon | null;
  _initialPlayer?: Pokemon | null;
  _rewardCombatants?: Pokemon[];
  isFishing?: boolean;
  isArchaeology?: boolean;
  lastDamage?: number;
  enemyUsedItem?: boolean;
  rewardTM?: string;
  playerStages?: BattleStages;
  enemyStages?: BattleStages;
  battleLogs?: BattleLog[];
  rewardsProcessed?: boolean;
  persistenceMode?: 'local' | 'remote';
  learnQueue?: unknown[];
  isPvP?: boolean;
  difficulty?: 'easy' | 'normal' | 'hard';
  _lastActivePlayer?: Pokemon | null;
  playerFled?: boolean;
  quote?: string;
  wasSearching?: boolean;
  cannotEscape?: boolean;
  stolenResources?: {
    money: number;
    items: Record<string, number>;
  };
}

export type BattleSource = Pokemon | 'player' | 'enemy_trainer' | 'enemy' | string;

export interface BattleLog {
  id: number;
  msg: string;
  type: string;
  side: 'player' | 'enemy' | string | null;
  icon?: string | null;
  iconType?: string | null;
  source?: BattleSource;
}

import type { BattleContext } from '@/types/battle/battleContext';

export type LogFn = (msg: string, type?: string, actor?: Pokemon | string | null, side?: 'player' | 'enemy' | null) => void;

export type MoveAction = (
  src: Pokemon, 
  tgt: Pokemon, 
  srcStages: BattleStages, 
  tgtStages: BattleStages, 
  addLogFn: LogFn, 
  battleCtx?: BattleContext
) => void;

export interface SparkleData {
  id: string | number;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string;
}

export interface BattleCombatantProps {
  side: 'player' | 'enemy';
  pokemon?: Pokemon | null;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
  baseSize: number;
  groundY?: string;
  shadowKey?: string | null;
  animState?: 'catching' | 'trapped' | 'releasing' | null;
  ballId?: string;
  isShaking?: boolean;
  isBlinking?: boolean;
  isHealing?: boolean;
  isSilhouette?: boolean;
  isAttacking?: boolean;
  activeMove?: {
    id?: string;
    side: string;
    cat: 'physical' | 'special' | 'status' | 'selfKO';
    name: string;
    selfKO?: boolean;
  } | null;
  showGuides?: boolean;
  isCaptureSuccess?: boolean;
  sparkles?: SparkleData[];
  isFainting?: boolean;
  isEmerging?: boolean;
  suppressFX?: boolean;
  hidden?: boolean;
  hasSeat?: boolean;
  stages?: Partial<BattleStages>;
}

