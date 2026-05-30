import { Pokemon } from './pokemon.ts';


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
  isGym?: boolean;
  gymId?: string;
  weather: BattleWeather;
  turnCount: number;
  over: boolean;
  turn?: 'player' | 'enemy' | null;
  isCapture?: boolean;
  escapeAttempts: number;
  rarity?: number;
  futureSightTurns?: number;
  futureSightTarget?: Pokemon | null;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon | null;
  _initialPlayer?: Pokemon | null;
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

import type { BattleContext } from './battleContext.ts';

export type LogFn = (msg: string, type?: string, actor?: Pokemon | string | null, side?: 'player' | 'enemy' | null) => void;

export type MoveAction = (
  src: Pokemon, 
  tgt: Pokemon, 
  srcStages: BattleStages, 
  tgtStages: BattleStages, 
  addLogFn: LogFn, 
  battleCtx?: BattleContext
) => void;
