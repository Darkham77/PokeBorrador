import type { Ref } from 'vue';
import type { GameState } from '@/types/system/game';
import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon';
import type { BattleState, BattleStages, BattleLog, BattleSource, BattleSide, BattleDifficulty, BattleMinigame } from '@/types/battle/battle';
import type { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';
import type { Event, GlobalMultipliers } from '@/logic/events/eventEngine';
import type { AuthUser, SessionMode } from '@/types/auth/auth';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { DayPhase, Season } from '@/logic/utils/timeUtils';
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
  minigame?: BattleMinigame | null;
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
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
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

export interface CompetitionEntryData {
  species?: PokemonSpeciesId;
  name?: string; // domain-ok
  nickname?: string | null; // domain-ok
  level?: number;
  score?: number;
  total_ivs?: number;
  ivs?: Record<string, number>; // open-record
  is_shiny?: boolean;
  obtained_at?: number;
  height?: number;
  weight?: number;
  displayValue?: string; // domain-ok
  display_value?: string; // domain-ok
  tier_label?: string; // domain-ok
  player_class?: string; // domain-ok
  trainer_level?: number;
  avatar_style?: string; // domain-ok
  nick_style?: string; // domain-ok
  gender?: string; // domain-ok
}

export interface CompetitionEntry {
  id?: string; // domain-ok
  event_id: string; // domain-ok
  category_id?: string; // domain-ok
  player_id: string; // domain-ok
  player_name?: string; // domain-ok
  player_email?: string; // domain-ok
  pokemon_uid: string; // domain-ok
  data?: CompetitionEntryData;
  submitted_at?: string; // domain-ok
}

// fallow-ignore-next-line unused-export
export const COMPETITION_RANK_KEYS = ['first', 'second', 'third'] as const;
export type CompetitionRankKey = (typeof COMPETITION_RANK_KEYS)[number];
export type CompetitionRank = CompetitionRankKey | number;

export interface PastCompetitionWinner {
  rank: CompetitionRank;
  category_id?: string; // domain-ok
  category_name?: string; // domain-ok
  player_id: string; // domain-ok
  player_name: string; // domain-ok
  player_class?: string; // domain-ok
  player_level?: number;
  avatar_style?: string; // domain-ok
  nick_style?: string; // domain-ok
  gender?: string; // domain-ok
  score?: number;
  entry_data?: CompetitionEntryData;
}

export interface PastEventHistoryItem {
  id: string; // domain-ok
  event_id: string; // domain-ok
  event_name: string; // domain-ok
  event_icon: string; // domain-ok
  event_description: string; // domain-ok
  event_schedule?: string | Record<string, unknown>; // open-record
  start_at?: string; // domain-ok
  end_at?: string; // domain-ok
  ended_at: string; // domain-ok
  winners: PastCompetitionWinner[];
  myAward: PendingAward | null;
  isWinner: boolean;
  hasUnclaimedAward: boolean;
  isClaimed: boolean;
}

export interface EventStore {
  activeEvents: Event[];
  pastEvents: PastEventHistoryItem[];
  pendingAwards: PendingAward[];
  userEntries: Record<string, CompetitionEntry>; // open-record
  isLoading: boolean;
  globalMultipliers: Partial<GlobalMultipliers>;
  fetchEvents: () => Promise<void>;
  fetchPastEvents: () => Promise<void>;
  fetchUserEntries: () => Promise<void>;
  checkPendingAwards: (notifyOnPending?: boolean) => Promise<void>;
  submitCompetitionEntry: (eventId: string, categoryIdOrUid: string, maybeUid?: string) => Promise<void>;
  claimAward: (awardId: string) => Promise<string | null>;
}

export interface CompetitionParticipant {
  uid: string; // domain-ok
  id: PokemonSpeciesId;
  name: string; // domain-ok
  nickname?: string | null; // domain-ok
  level: number;
  isShiny: boolean;
  ivs?: Pokemon['ivs'];
  size?: string; // domain-ok
  height?: number;
  weight?: number;
  displayValue?: string; // domain-ok
  score?: number;
}

export interface CompetitionResult {
  id: string; // domain-ok
  event_id: string; // domain-ok
  winners: {
    first?: { player_name: string; score: number };
    second?: { player_name: string; score: number };
    third?: { player_name: string; score: number };
  } | PastCompetitionWinner[];
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
