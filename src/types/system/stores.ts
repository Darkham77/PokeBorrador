import { Ref } from 'vue';
import { GameState } from '@/types/system/game';
import { Pokemon, type PokemonSelectionSource } from '@/types/pokemon/pokemon';
import { BattleState, BattleStages, BattleLog, BattleSource, BattleSide, BattleDifficulty } from '@/types/battle/battle';
import { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';
import { Event, GlobalMultipliers } from '@/logic/events/eventEngine';
import { AuthUser, SessionMode } from '@/types/auth/auth';
import { DBRouter } from '@/logic/db/dbRouter';
import { DayPhase, Season } from '@/logic/utils/timeUtils';
import type { Inventory } from '@/types/inventory/items';
import type { MapRouteId } from '@/data/world/map-assets';
import type { GymId } from '@/data/world/gyms';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { ItemId } from '@/data/inventory/items';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { FactionId } from '@/types/system/game';

export interface WorldMap {
  id: MapRouteId;
  name: string; // domain-ok
  icon: string; // domain-ok
  badges: number;
  desc: string; // domain-ok
  wild: Record<DayPhase, string[]>;
  rates: { morning: number[]; day: number[]; dusk: number[]; night: number[] };
  lv: [number, number];
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  fishing?: { pool: string[]; rates: number[]; lv: [number, number] };
  weather?: Partial<Record<WeatherId, {
    visitors: Partial<Record<PokemonSpeciesId, number>>;
    exclusive?: Partial<Record<PokemonSpeciesId, number>>;
  }>>;
}

export interface DominanceInfo {
  winner: FactionId | null;
  since?: number;
  union?: number;
  poder?: number;
  guardian?: { id: PokemonSpeciesId, captured: boolean } | null;
}

export interface BattleOptions {
  isTrainer?: boolean;
  trainerName?: string; // domain-ok
  isGym?: boolean;
  gymId?: GymId;
  locationId?: MapRouteId;
  wasSearching?: boolean;
  enemyTeam?: Pokemon[];
  isFishing?: boolean;
  isArchaeology?: boolean;
  isGuardian?: boolean;
  pts?: number;
  isDebug?: boolean;
  difficulty?: BattleDifficulty;
  rewardTM?: ItemId;
  trainerSprite?: NpcSpriteId;
  trainerArchetype?: NpcArchetype;
  isRival?: boolean;
  persistenceMode?: 'local' | 'remote';
  cannotEscape?: boolean;
  trainerQuote?: string; // domain-ok
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
  scheduleSave: () => void;
  save: (showNotif?: boolean) => Promise<{ success: boolean; migrated?: boolean; lastSaveId?: string; rollback?: boolean; outOfSync?: boolean; error?: string; remote?: boolean } | void>;
  loadGame: () => Promise<void>;
  registerPokedex: (speciesId: string) => void;
  addTrainerExp: (amount: number) => void;
  checkLevelUp: (pokemon: Pokemon) => void;
  updateState: (newData: Partial<GameState>) => void;
  chooseStarter: (pokeId: string) => void;
  togglePokeTag: (context: PokemonSelectionSource, index: number, tagId: string) => void;
  reorderMoves: (pokemon: Pokemon, from: number, to: number) => void;
  fetchClaimQueue: () => Promise<void>;
  saveGame: (showNotif?: boolean) => Promise<{ success: boolean; migrated?: boolean; lastSaveId?: string; rollback?: boolean; outOfSync?: boolean; error?: string; remote?: boolean } | void>;
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
  addLog: (msg: string, type?: string, source?: BattleSource | null, sideOverride?: BattleSide | null) => void;
  startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  _startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  executeMove: (moveIndex: number) => Promise<void>;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  handleFaint: (side: BattleSide) => Promise<void>;
  persistBattle: () => void;
  triggerSearchEncounter: () => Promise<void>;
  useItemInBattle: (itemName: string, targetIndex: number | null) => Promise<void>;
}

export interface ConfirmOptions {
  title: string; // domain-ok
  message: string; // domain-ok
  confirmText?: string; // domain-ok
  cancelText?: string; // domain-ok
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface PromptOptions {
  title: string; // domain-ok
  message: string; // domain-ok
  initialValue?: string; // domain-ok
  confirmText?: string; // domain-ok
  cancelText?: string; // domain-ok
  onConfirm: (value: string) => void;
}

export interface UINotification {
  id: string | number; // domain-ok
  msg: string; // domain-ok
  icon: string; // domain-ok
}

export interface UIStore {
  activeTab: string; // domain-ok
  notifications: UINotification[];
  isBattleSwitchForced: boolean;
  isDebugPerformanceMode: boolean;
  isAnyBlockingModalOpen: boolean;
  isAnyFullscreenModalOpen: boolean;
  openHudGroup: string | null; // domain-ok
  autoBattle: boolean;
  setAutoBattle: (val: boolean) => void;
  notify: (msg: string, icon?: string) => void;
  openConfirm: (options: Record<string, unknown>) => string | null; // open-record
  openPrompt: (options: Record<string, unknown>) => string | null; // open-record
  open: (name: string, props?: Record<string, unknown>) => void; // open-record
  close: (name: string) => void;
  closeAll: () => void;
  setLoading: (val: boolean, msg?: string, sub?: string) => void;
  toggleHudGroup: (name: string | null) => void;
}

export interface MapStore {
  currentMap: MapRouteId;
  currentWeather: WeatherId;
  globalWeather: WeatherId | null;
  mapWinners: Partial<Record<MapRouteId, DominanceInfo>>;
  activeEvents: Event[];
  currentSeason: Season;
  currentEpochHour: number;
  currentCycle: DayPhase;
  maps: WorldMap[];
  setGlobalWeather: (w: WeatherId | null) => void;
  setGlobalCycle: (c: DayPhase | null) => void;
  navigate: (locId: MapRouteId) => Promise<void>;
}

export interface PendingAward {
  id: string; // domain-ok
  winner_id: string; // domain-ok
  prize: string; // domain-ok
  received_at: string | null; // domain-ok
  event_id?: string; // domain-ok
  prize_summary?: string; // domain-ok
}

export interface EventStore {
  activeEvents: Event[];
  pendingAwards: PendingAward[];
  isLoading: boolean;
  globalMultipliers: Partial<GlobalMultipliers>;
  fetchEvents: () => Promise<void>;
  checkPendingAwards: () => Promise<void>;
  submitCompetitionEntry: (eventId: string, pokemonUid: string) => Promise<void>;
  claimAward: (awardId: string) => Promise<string | null>;
}

// DominanceInfo merged at the top

export interface CompetitionResult {
  id: string; // domain-ok
  event_id: string; // domain-ok
  winners: {
    first?: { player_name: string; score: number };
    second?: { player_name: string; score: number };
    third?: { player_name: string; score: number };
  };
  ended_at: string; // domain-ok
}

export interface WarStore {
  faction: FactionId | null;
  warCoins: number;
  weeklyPoints: number;
  mapDominance: Partial<Record<MapRouteId, DominanceInfo>>;
  dailyGuardianCaptures: MapRouteId[];
  addPoints: (mapId: MapRouteId, eventType: string, success: boolean, customPoints?: number) => Promise<number>;
  claimGuardian: (mapId: MapRouteId, isDefeat?: boolean) => Promise<void>;
}

export interface PlayerClassStore {
  playerClass: PlayerClassId | null;
  classLevel: number;
  getModifier: (type: string, context?: Record<string, unknown>) => number; // open-record
  addCriminality: (amount: number) => void;
}

export interface AudioStore {
  play: (type: string) => Promise<void>;
}

export interface AuthStore {
  user: AuthUser | null;
  sessionMode: SessionMode;
  sessionId: string; // domain-ok
  isOnline: boolean;
  connectionLost: boolean;
  sessionConflict: boolean;
  logout: () => Promise<void>;
}
export type TradeCardMode = 'incoming' | 'outgoing' | 'accepted';

export interface TradeOffer {
  id: string; // domain-ok
  sender_id: string; // domain-ok
  receiver_id: string; // domain-ok
  offer_pokemon: Pokemon | null;
  offer_items: Inventory;
  offer_money: number;
  request_pokemon: Pokemon | null;
  request_items: Inventory;
  request_money: number;
  message: string; // domain-ok
  status: 'pending' | 'accepted' | 'rejected' | 'claimed';
  created_at: string; // domain-ok
}

export interface InventoryStore {
  addItem: (itemName: string, qty?: number) => void;
  removeItem: (itemName: string, qty?: number) => void;
}

export interface ShopStore {
  healAllPokemon: (cost?: number) => void;
}
