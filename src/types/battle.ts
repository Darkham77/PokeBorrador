import { Pokemon } from './pokemon';

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
  isTrainer: boolean;
  trainerName?: string;
  isGym?: boolean;
  gymId?: string;
  weather: BattleWeather;
  turnCount: number;
  over: boolean;
  isCapture?: boolean;
  escapeAttempts: number;
  rarity?: number;
  futureSightTurns?: number;
  futureSightTarget?: Pokemon | null;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon;
  isFishing?: boolean;
  lastDamage?: number;
  enemyUsedItem?: boolean;
}

export interface BattleLog {
  id: number;
  msg: string;
  type: string;
  source?: string | Pokemon;
  side?: 'player' | 'enemy' | null;
}

export interface BattleContext {
  atkStages?: number;
  defStages?: number;
  playerStages?: Partial<BattleStages>;
  enemyStages?: Partial<BattleStages>;
  weather?: BattleWeather | null;
  turnCount?: number;
  locationId?: string;
  cycle?: string;
  magnitudeSet?: number;
}

export type LogFn = (msg: string, type?: string, actor?: any) => void;

export type MoveAction = (
  src: Pokemon, 
  tgt: Pokemon, 
  srcStages: BattleStages, 
  tgtStages: BattleStages, 
  addLogFn: LogFn, 
  battleCtx?: any
) => void;
