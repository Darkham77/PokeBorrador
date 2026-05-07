
import { Ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GameState } from './game';
import { Pokemon } from './pokemon';
import { BattleState, BattleStages, BattleLog } from './battle';
import { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';

export interface GameStore {
  state: GameState;
  db: SupabaseClient;
  isDataLoaded: boolean;
  isEngineReady: boolean;
  isReady: boolean;
  isSaveLocked: boolean;
  addPokemon: (p: Pokemon, options?: { silent?: boolean; source?: string; notify?: boolean }) => void;
  removePokemon: (uid: string) => void;
  hatchEggs: () => void;
  scheduleSave: () => void;
  save: (showNotif?: boolean) => Promise<void>;
  loadGame: () => Promise<void>;
  registerPokedex: (speciesId: string) => void;
  addTrainerExp: (amount: number) => void;
  checkLevelUp: (pokemon: Pokemon) => void;
  updateState: (newData: Partial<GameState>) => void;
  resetToInitial: () => void;
  chooseStarter: (pokeId: string) => void;
  togglePokeTag: (context: 'team' | 'box' | 'market', index: number, tagId: string) => void;
  reorderMoves: (pokemon: Pokemon, from: number, to: number) => void;
}

export interface BattleStore {
  state: BattleState | null;
  isBattleActive: boolean;
  isFinishing: boolean;
  isProcessing: boolean;
  isSearching: boolean;
  playerStages: BattleStages;
  enemyStages: BattleStages;
  battleLogs: BattleLog[];
  debugLoopPokemon: Pokemon | null;
  fsm: {
    currentState: Ref<BattleStateName>;
    currentSubState: Ref<BattleSubStateName | null>;
    transition: (newState: BattleStateName | BattleSubStateName, newSubState?: BattleSubStateName | null, delayMs?: number) => Promise<any>;
  };
  addLog: (msg: string, type?: string, source?: Pokemon | string | null, sideOverride?: 'player' | 'enemy' | null) => void;
  startBattle: (enemy: Pokemon, options?: { 
    isTrainer?: boolean; 
    trainerName?: string; 
    isGym?: boolean; 
    gymId?: string;
    locationId?: string;
    wasSearching?: boolean;
    enemyTeam?: Pokemon[];
    battleOptions?: any;
  }) => Promise<void>;
  _startBattle: (enemy: Pokemon, options?: { 
    isTrainer?: boolean; 
    trainerName?: string; 
    isGym?: boolean; 
    gymId?: string;
    locationId?: string;
    wasSearching?: boolean;
    enemyTeam?: Pokemon[];
    battleOptions?: any;
  }) => Promise<void>;
  executeMove: (moveIndex: number) => Promise<void>;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  handleFaint: (side: 'player' | 'enemy') => Promise<void>;
  persistBattle: () => void;
  triggerSearchEncounter: () => Promise<void>;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface PromptOptions {
  title: string;
  message: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
}

export interface UIStore {
  activeTab: string;
  isBattleSwitchForced: boolean;
  notify: (msg: string, icon?: string) => void;
  openConfirm: (options: any) => void;
  openPrompt: (options: any) => void;
  open: (name: string, props?: Record<string, unknown>) => void;
  close: (name: string) => void;
  closeAll: () => void;
  setLoading: (val: boolean, msg?: string, sub?: string) => void;
}

export interface MapStore {
  currentMap: string;
  currentWeather: string;
  globalWeather: string | null;
  mapWinners: Record<string, string>;
  activeEvents: Array<{ id: string; name: string; type: string }>;
  currentSeason: { id: string; name: string };
  currentEpochHour: number;
}

export interface PendingAward {
  id: string;
  winner_id: string;
  prize: string;
  received_at: string | null;
  event_id?: string;
  prize_summary?: string;
}

export interface EventStore {
  activeEvents: any[];
  pendingAwards: PendingAward[];
  isLoading: boolean;
  globalMultipliers: {
    shiny: number;
    exp: number;
    money: number;
  };
  fetchEvents: () => Promise<void>;
  checkPendingAwards: () => Promise<void>;
  submitCompetitionEntry: (pokemon: Pokemon, eventId: string) => Promise<void>;
  claimAward: (awardId: string) => Promise<any>;
  getEventMultiplier: (pokemon: Pokemon, eventId: string) => number;
  getCaptureEvent: (speciesId: string) => any;
}

export interface DominanceInfo {
  union: number;
  poder: number;
  winner: string | null;
}

export interface CompetitionResult {
  id: string;
  event_id: string;
  winners: string; // JSON string in DB
  ended_at: string;
}

export interface WarStore {
  faction: 'union' | 'poder' | null;
  warCoins: number;
  weeklyPoints: number;
  mapDominance: Record<string, DominanceInfo>;
  addPoints: (mapId: string, eventType: string, success: boolean) => Promise<number>;
}

export interface PlayerClassStore {
  playerClass: string | null;
  classLevel: number;
  getModifier: (type: string, context?: Record<string, unknown>) => number;
}

export interface AudioStore {
  play: (type: string) => Promise<void>;
  shiny: () => void;
  levelUp: () => void;
  money: () => void;
  faint: () => void;
  heal: () => void;
}
