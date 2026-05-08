import { Ref } from 'vue';
import { GameState } from './game';
import { Pokemon } from './pokemon';
import { BattleState, BattleStages, BattleLog } from './battle';
import { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';
import { Event } from '@/logic/events/eventEngine';
import { AuthUser } from './auth';
import { DBRouter } from '@/logic/db/dbRouter';

export interface BattleOptions {
  isTrainer?: boolean;
  trainerName?: string;
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  wasSearching?: boolean;
  enemyTeam?: Pokemon[];
  isFishing?: boolean;
  isGuardian?: boolean;
  pts?: number;
  isDebug?: boolean;
  difficulty?: string;
  rewardTM?: string;
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

export interface UIStore {
  activeTab: string;
  isBattleSwitchForced: boolean;
  notify: (msg: string, icon?: string) => void;
  openConfirm: (options: ConfirmOptions) => void;
  openPrompt: (options: PromptOptions) => void;
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
  activeEvents: Event[];
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
  activeEvents: Event[];
  pendingAwards: PendingAward[];
  isLoading: boolean;
  globalMultipliers: {
    shiny: number;
    exp: number;
    money: number;
    catch: number;
  };
  fetchEvents: () => Promise<void>;
  checkPendingAwards: () => Promise<void>;
  submitCompetitionEntry: (pokemon: Pokemon, eventId: string) => Promise<void>;
  claimAward: (awardId: string) => Promise<string | null>;
  getEventMultiplier: (pokemon: Pokemon, eventId: string) => number;
  getCaptureEvent: (speciesId: string) => Event | null | undefined;
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

export interface LoadingStore {
  start: (id: string, message?: string, subMessage?: string, isGlobal?: boolean) => void;
  finish: (id: string) => void;
  clearAll: () => void;
}

export interface SocialStore {
  notifications: { friends: number; trades: number; battles: number; total: number };
  refreshNotificationCount: () => Promise<void>;
}

export interface ShopStore {
  buyItem: (itemId: string, qty: number) => Promise<void>;
  sellItem: (itemId: string, qty: number) => Promise<void>;
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

export interface TradeStore {
  tradeTarget: { id: string; username: string } | null;
  tradeFriendSave: GameState | null;
  tradeOfferPoke: Pokemon | null;
  tradeRequestPoke: Pokemon | null;
  tradeOfferItems: Record<string, number>;
  tradeRequestItems: Record<string, number>;
  pendingIncoming: TradeOffer[];
  pendingOutgoing: TradeOffer[];
  pendingAccepted: TradeOffer[];
  lockedUids: Set<string>;
  subscribeTradeNotifs: () => Promise<void>;
  refreshPendingTrades: () => Promise<void>;
  openTradeModal: (friendId: string, friendUsername: string) => Promise<void>;
  sendTradeOffer: (options: { isGift: boolean; offerMoney: number; requestMoney: number; message: string }) => Promise<boolean>;
  acceptTrade: (tradeId: string | number) => Promise<boolean>;
  rejectTrade: (tradeId: string | number) => Promise<void>;
  claimTrade: (tradeId: string | number) => Promise<void>;
}

export interface PvPStore {
  updateElo: (won: boolean) => Promise<number>;
}
