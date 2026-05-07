
import { Ref } from 'vue';
import { GameState } from './game';
import { Pokemon } from './pokemon';
import { BattleState, BattleStages, BattleLog } from './battle';
import { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';

export interface GameStore {
  state: GameState;
  addPokemon: (p: Pokemon, options?: { silent?: boolean; source?: string }) => void;
  hatchEggs: () => void;
  scheduleSave: () => void;
  registerPokedex: (speciesId: string) => void;
  addTrainerExp: (amount: number) => void;
  checkLevelUp: (pokemon: Pokemon) => void;
  updateState: (newData: Partial<GameState>) => void;
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
    transition: (newState: BattleStateName | BattleSubStateName, newSubState?: BattleSubStateName | null, delayMs?: number) => Promise<void>;
  };
  addLog: (msg: string, type?: string, source?: Pokemon | string | null, sideOverride?: 'player' | 'enemy' | null) => void;
  _startBattle: (enemy: Pokemon, options: { isWild?: boolean; mapId?: string }) => void;
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
  notify: (msg: string, icon?: string) => void;
  openConfirm: (options: ConfirmOptions) => void;
  openPrompt: (options: PromptOptions) => void;
  open: (name: string, props?: Record<string, unknown>) => void;
  close: (name: string) => void;
  closeAll: () => void;
  setLoading: (val: boolean, msg?: string, sub?: string) => void;
  isBattleSwitchForced: boolean;
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

export interface EventStore {
  globalMultipliers: {
    shiny: number;
    exp: number;
    money: number;
  };
}
