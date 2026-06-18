import { Ref } from 'vue';
import { GameState } from '@/types/system/game';
import { Pokemon } from '@/types/pokemon/pokemon';
import { BattleState, BattleStages, BattleLog } from '@/types/battle/battle';
import { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';
import { Event, GlobalMultipliers } from '@/logic/events/eventEngine';
import { AuthUser } from '@/types/auth/auth';
import { DBRouter } from '@/logic/db/dbRouter';
import { DayPhase, Season } from '@/logic/utils/timeUtils';

export interface WorldMap {
  id: string;
  name: string;
  icon: string;
  badges: number;
  desc: string;
  wild: { morning: string[]; day: string[]; dusk: string[]; night: string[] };
  rates: { morning: number[]; day: number[]; dusk: number[]; night: number[] };
  lv: [number, number];
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  fishing?: { pool: string[]; rates: number[]; lv: [number, number] };
  weather?: Record<string, { visitors: Record<string, number>; exclusive?: Record<string, number> }>;
}

export interface DominanceInfo {
  winner: string | null;
  since?: number;
  union?: number;
  poder?: number;
  guardian?: { id: string, captured: boolean } | null;
}

export interface BattleOptions {
  isTrainer?: boolean;
  trainerName?: string;
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  wasSearching?: boolean;
  enemyTeam?: Pokemon[];
  isFishing?: boolean;
  isArchaeology?: boolean;
  isGuardian?: boolean;
  pts?: number;
  isDebug?: boolean;
  difficulty?: string;
  rewardTM?: string;
  trainerSprite?: string;
  trainerArchetype?: string;
  isRival?: boolean;
  persistenceMode?: string;
  cannotEscape?: boolean;
  trainerQuote?: string;
}

export interface GameStore {
  state: GameState;
  db: DBRouter;
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
  fetchClaimQueue: () => Promise<void>;
  saveGame: (showNotif?: boolean) => Promise<void>;
  chats: Record<string, unknown>;
  eloRating: number;
}

export interface BattleStore {
  state: BattleState | null;
  isBattleActive: boolean;
  isFinishing: boolean;
  isProcessing: boolean;
  isSearching: boolean;
  player: Pokemon | null | undefined;
  enemy: Pokemon | null | undefined;
  playerStages: BattleStages;
  enemyStages: BattleStages;
  battleLogs: BattleLog[];
  debugLoopPokemon: Pokemon | null;
  isPvP: boolean;
  fsm: {
    currentState: Ref<BattleStateName>;
    currentSubState: Ref<BattleSubStateName | null>;
    transition: (newState: BattleStateName | BattleSubStateName, newSubState?: BattleSubStateName | null, delayMs?: number) => Promise<void>;
  };
  addLog: (msg: string, type?: string, source?: Pokemon | string | null, sideOverride?: 'player' | 'enemy' | null) => void;
  startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  _startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  executeMove: (moveIndex: number) => Promise<void>;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  handleFaint: (side: 'player' | 'enemy') => Promise<void>;
  persistBattle: () => void;
  triggerSearchEncounter: () => Promise<void>;
  useItemInBattle: (itemName: string, targetIndex: number | null) => Promise<void>;
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

export interface UINotification {
  id: string | number;
  msg: string;
  icon: string;
}

export interface UIStore {
  activeTab: string;
  notifications: UINotification[];
  isBattleSwitchForced: boolean;
  isDebugPerformanceMode: boolean;
  isAnyBlockingModalOpen: boolean;
  isAnyModalOpen: boolean;
  isAnyFullscreenModalOpen: boolean;
  openHudGroup: string | null;
  autoBattle: boolean;
  setAutoBattle: (val: boolean) => void;
  notify: (msg: string, icon?: string) => void;
  openConfirm: (options: ConfirmOptions) => void;
  openPrompt: (options: PromptOptions) => void;
  open: (name: string, props?: Record<string, unknown>) => void;
  close: (name: string) => void;
  closeAll: () => void;
  setLoading: (val: boolean, msg?: string, sub?: string) => void;
  toggleHudGroup: (name: string | null) => void;
}

export interface MapStore {
  currentMap: string;
  currentMapData: WorldMap | undefined;
  region: string;
  currentWeather: string;
  globalWeather: string | null;
  mapWinners: Record<string, DominanceInfo>;
  activeEvents: Event[];
  currentSeason: Season;
  currentEpochHour: number;
  currentCycle: DayPhase;
  maps: WorldMap[];
  setGlobalWeather: (w: string | null) => void;
  setGlobalCycle: (c: DayPhase | null) => void;
  navigate: (locId: string) => Promise<void>;
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
  activeEvents: Event[];
  pendingAwards: PendingAward[];
  isLoading: boolean;
  globalMultipliers: Partial<GlobalMultipliers>;
  fetchEvents: () => Promise<void>;
  checkPendingAwards: () => Promise<void>;
  submitCompetitionEntry: (pokemon: Pokemon, eventId: string) => Promise<void>;
  claimAward: (awardId: string) => Promise<string | null>;
  getEventMultiplier: (pokemon: Pokemon, eventId: string) => number;
  getCaptureEvent: (speciesId: string) => Event | null | undefined;
}

// DominanceInfo merged at the top

export interface CompetitionResult {
  id: string;
  event_id: string;
  winners: {
    first?: { player_name: string; score: number };
    second?: { player_name: string; score: number };
    third?: { player_name: string; score: number };
  };
  ended_at: string;
}

export interface WarStore {
  faction: 'union' | 'poder' | null;
  warCoins: number;
  weeklyPoints: number;
  mapDominance: Record<string, DominanceInfo>;
  isLoading: boolean;
  dailyGuardianCaptures: string[];
  addPoints: (mapId: string, eventType: string, success: boolean, customPoints?: number) => Promise<number>;
  claimGuardian: (mapId: string, isDefeat?: boolean) => Promise<void>;
  resolveWeeklySeason: () => Promise<void>;
}

export interface PlayerClassStore {
  playerClass: string | null;
  classLevel: number;
  getModifier: (type: string, context?: Record<string, unknown>) => number;
  addCriminality: (amount: number) => void;
}

export interface AudioStore {
  play: (type: string) => Promise<void>;
  shiny: () => void;
  levelUp: () => void;
  money: () => void;
  faint: () => void;
  heal: () => void;
  victoryTrainer: () => void;
  defeat: () => void;
  notif: () => void;
  sentMsg: () => void;
  receivedMsg: () => void;
  flee: () => void;
  ballHit: () => void;
  wobble: () => void;
  caught: () => void;
  evolution: () => void;
  menuOpen: () => void;
  menuClose: () => void;
  steal: () => void;
  siren: () => void;
}

export interface AuthStore {
  user: AuthUser | null;
  sessionMode: 'online' | 'offline';
  sessionId: string;
  isOnline: boolean;
  connectionLost: boolean;
  sessionConflict: boolean;
  logout: () => Promise<void>;
}
export interface TradeOffer {
  id: string;
  sender_id: string;
  receiver_id: string;
  offer_pokemon: Pokemon | null;
  offer_items: Record<string, number>;
  offer_money: number;
  request_pokemon: Pokemon | null;
  request_items: Record<string, number>;
  request_money: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'claimed';
  created_at: string;
}

export interface InventoryStore {
  addItem: (itemName: string, qty?: number) => void;
  removeItem: (itemName: string, qty?: number) => void;
}

export interface ShopStore {
  healAllPokemon: (cost?: number) => void;
}

