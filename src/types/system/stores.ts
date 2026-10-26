import type { AssetUri, DisplayText, IsoDateString } from '@francogp/auditor';
import type { Ref } from 'vue';

import type { ItemId } from '@/data/inventory/items';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { BattleStateName, BattleSubStateName } from '@/logic/battle/battleStateMachine';
import type { PokemonTagId } from '@/logic/constants/tags';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { Event, GlobalMultipliers } from '@/logic/events/eventEngine';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { Season } from '@/logic/utils/timeUtils';
import type { WarEventType } from '@/logic/war/warEngine';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { AuthUser, SessionMode } from '@/types/auth/auth';
import type {
  BattleState,
  BattleStages,
  BattleLog,
  BattleSource,
  BattleSide,
  BattleDifficulty,
  BattleMinigame,
  PersistenceMode
} from '@/types/battle/battle';
import type { Inventory } from '@/types/inventory/items';
import type {
  Pokemon,
  PokemonSelectionSource,
  PokemonCompetitionRank,
  PokemonStatKey
} from '@/types/pokemon/pokemon';
import type { GameState, GenderId } from '@/types/system/game';
import type { FactionId } from '@/types/system/game';
import type { DayPhase } from '@/types/system/time';

export interface WorldMap {
  id: MapRouteId;
  name: DisplayText;
  icon: AssetUri;
  badges: number;
  desc: DisplayText;
  wild: Record<DayPhase, readonly PokemonSpeciesId[]>;
  rates: { morning: number[]; day: number[]; dusk: number[]; night: number[] };
  lv: [number, number];
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  fishing?: { pool: readonly PokemonSpeciesId[]; rates: number[]; lv: [number, number] };
  weather?: Partial<
    Record<
      WeatherId,
      {
        visitors: Partial<Record<PokemonSpeciesId, number>>;
        exclusive?: Partial<Record<PokemonSpeciesId, number>>;
      }
    >
  >;
}

export interface DominanceInfo {
  winner: FactionId | null;
  since?: number;
  union?: number;
  poder?: number;
  guardian?: { id: PokemonSpeciesId; captured: boolean } | null;
}

export interface BattleOptions {
  isTrainer?: boolean;
  trainerName?: DisplayText;
  isGym?: boolean;
  isRematch?: boolean;
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
  trainerSprite?: NpcSpriteId | PlayerClassId;
  trainerGender?: GenderId;
  trainerArchetype?: NpcArchetype;
  isRival?: boolean;
  persistenceMode?: PersistenceMode;
  cannotEscape?: boolean;
  trainerQuote?: DisplayText;
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
  isPvP?: boolean;
  isRanked?: boolean;
  pvpMatchId?: DisplayText;
  pvpIsHost?: boolean;
  pvpOpponentId?: DisplayText;
  pvpOpponentName?: DisplayText;
  playerTeam?: Pokemon[];
  returnTab?: DisplayText;
  battleOptions?: Partial<BattleOptions>;
}

export interface GameStore {
  state: GameState;
  db: DBRouter;
  isDataLoaded: boolean;
  isEngineReady: boolean;
  isReady: boolean;
  isSaveLocked: boolean;
  addPokemon: (
    p: Pokemon,
    options?: { silent?: boolean; source?: DisplayText; notify?: boolean }
  ) => void;
  removePokemon: (uid: DisplayText) => void;
  scheduleSave: (delayMs?: number, forceRemote?: boolean) => void;
  withBatchSave: <T>(action: () => Promise<T>, showNotifOnEnd?: boolean) => Promise<T>;
  save: (
    showNotif?: boolean,
    immediate?: boolean,
    forceRemote?: boolean
  ) => Promise<{
    success: boolean;
    migrated?: boolean;
    lastSaveId?: DisplayText;
    rollback?: boolean;
    outOfSync?: boolean;
    error?: DisplayText;
    remote?: boolean;
  } | void>;
  loadGame: () => Promise<void>;
  registerPokedex: (speciesId: PokemonSpeciesId) => void;
  addTrainerExp: (amount: number) => void;
  checkLevelUp: (pokemon: Pokemon) => void;
  updateState: (newData: Partial<GameState>) => void;
  chooseStarter: (pokeId: PokemonSpeciesId) => void;
  togglePokeTag: (context: PokemonSelectionSource, index: number, tagId: PokemonTagId) => void;
  reorderMoves: (pokemon: Pokemon, from: number, to: number) => void;
  fetchClaimQueue: () => Promise<void>;
  saveGame: (
    showNotif?: boolean,
    immediate?: boolean,
    forceRemote?: boolean
  ) => Promise<{
    success: boolean;
    migrated?: boolean;
    lastSaveId?: DisplayText;
    rollback?: boolean;
    outOfSync?: boolean;
    error?: DisplayText;
    remote?: boolean;
  } | void>;
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
  isPlayerTrapped?: boolean;
  fsm: {
    currentState: Ref<BattleStateName>;
    currentSubState: Ref<BattleSubStateName | null>;
    transition: (
      newState: BattleStateName | BattleSubStateName,
      newSubState?: BattleSubStateName | null,
      delayMs?: number
    ) => Promise<void>;
  };
  addLog: (
    msg: DisplayText,
    type?: DisplayText,
    source?: BattleSource | null,
    sideOverride?: BattleSide | null
  ) => void;
  startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  _startBattle: (enemy: Pokemon, options?: BattleOptions) => Promise<void>;
  executeMove: (moveIndex: number) => Promise<void>;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  handleFaint: (side: BattleSide) => Promise<void>;
  persistBattle: () => void;
  triggerSearchEncounter: () => Promise<void>;
  useItemInBattle: (itemId: ItemId, targetIndex: number | null) => Promise<void>;
}

export interface ConfirmOptions {
  title: DisplayText;
  message: DisplayText;
  confirmText?: DisplayText;
  cancelText?: DisplayText;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

export interface PromptOptions {
  title: DisplayText;
  message: DisplayText;
  initialValue?: DisplayText;
  confirmText?: DisplayText;
  cancelText?: DisplayText;
  onConfirm: (value: DisplayText) => void | Promise<void>;
}

export interface UINotification {
  id: DisplayText | number;
  msg: DisplayText;
  icon: AssetUri;
}

export interface UIStore {
  activeTab: DisplayText;
  notifications: UINotification[];
  isBattleSwitchForced: boolean;
  isDebugFastMode: boolean;
  isFastMode: boolean;
  isAnyBlockingModalOpen: boolean;
  isAnyFullscreenModalOpen: boolean;
  openHudGroup: DisplayText | null;
  autoBattle: boolean;
  setAutoBattle: (val: boolean) => void;
  notify: (msg: DisplayText, icon?: AssetUri) => void;
  openConfirm: (options: Record<DisplayText, unknown>) => DisplayText | null;
  openPrompt: (options: Record<DisplayText, unknown>) => DisplayText | null;
  open: (name: DisplayText, props?: Record<DisplayText, unknown>) => void;
  close: (name: DisplayText) => void;
  closeAll: () => void;
  setLoading: (val: boolean, msg?: DisplayText, sub?: DisplayText) => void;
  toggleHudGroup: (name: DisplayText | null) => void;
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
  id: DisplayText;
  winner_id: DisplayText;
  prize: DisplayText;
  received_at: IsoDateString | null;
  event_id?: DisplayText;
  prize_summary?: DisplayText;
  awarded_at?: IsoDateString;
  category_id?: DisplayText;
  category_name?: DisplayText;
}

export interface CompetitionEntryData {
  species?: PokemonSpeciesId;
  name?: DisplayText;
  nickname?: DisplayText | null;
  level?: number;
  score?: number;
  total_ivs?: number;
  ivs?: Partial<Record<PokemonStatKey, number>>;
  is_shiny?: boolean;
  obtained_at?: number;
  height?: number;
  weight?: number;
  friendship?: number;
  displayValue?: DisplayText;
  display_value?: DisplayText;
  tier_label?: DisplayText;
  player_class?: DisplayText;
  trainer_level?: number;
  avatar_style?: DisplayText;
  nick_style?: DisplayText;
  gender?: DisplayText;
}

export interface CompetitionEntry {
  id?: DisplayText;
  event_id: DisplayText;
  category_id?: DisplayText;
  player_id: DisplayText;
  player_name?: DisplayText;
  player_email?: DisplayText;
  pokemon_uid: DisplayText;
  data?: CompetitionEntryData;
  submitted_at?: IsoDateString;
}

export const EVENT_REWARD_TYPES = ['money', 'bc', 'item', 'pokemon', 'mixed'] as const;
export type EventRewardType = (typeof EVENT_REWARD_TYPES)[number];

export const EVENT_TYPE_KINDS = ['competition', 'boost', 'passive_bonus'] as const;
export type EventTypeKind = (typeof EVENT_TYPE_KINDS)[number];

export type CompetitionRank = PokemonCompetitionRank | number;

export interface PastCompetitionWinner {
  rank: CompetitionRank;
  category_id?: DisplayText;
  category_name?: DisplayText;
  player_id: DisplayText;
  player_name: DisplayText;
  player_class?: DisplayText;
  player_level?: number;
  avatar_style?: DisplayText;
  nick_style?: DisplayText;
  gender?: DisplayText;
  score?: number;
  entry_data?: CompetitionEntryData;
}

export interface PastEventHistoryItem {
  id: DisplayText;
  event_id: DisplayText;
  event_name: DisplayText;
  event_icon: AssetUri;
  event_description: DisplayText;
  event_schedule?: DisplayText | Record<DisplayText, unknown>;
  start_at?: IsoDateString;
  end_at?: IsoDateString;
  ended_at: IsoDateString;
  winners: PastCompetitionWinner[];
  myAward: PendingAward | null;
  myAwards?: PendingAward[];
  isWinner: boolean;
  hasUnclaimedAward: boolean;
  isClaimed: boolean;
  raw_event?: Event | null;
}

export interface EventStore {
  activeEvents: Event[];
  pastEvents: PastEventHistoryItem[];
  pendingAwards: PendingAward[];
  userEntries: Partial<Record<DisplayText, CompetitionEntry>>;
  isLoading: boolean;
  globalMultipliers: Partial<GlobalMultipliers>;
  fetchEvents: () => Promise<void>;
  fetchPastEvents: () => Promise<void>;
  fetchUserEntries: () => Promise<void>;
  checkPendingAwards: (notifyOnPending?: boolean) => Promise<void>;
  submitCompetitionEntry: (
    eventId: DisplayText,
    categoryIdOrUid: DisplayText,
    maybeUid?: DisplayText
  ) => Promise<void>;
  claimAward: (awardId: DisplayText) => Promise<DisplayText | null>;
  claimAllEventAwards: (
    eventId: DisplayText
  ) => Promise<{ success: boolean; claimedCount: number }>;
  discardAward: (awardId: DisplayText) => Promise<boolean>;
}

export interface CompetitionParticipant {
  uid: DisplayText;
  id: PokemonSpeciesId;
  name: DisplayText;
  nickname?: DisplayText | null;
  level: number;
  isShiny: boolean;
  ivs?: Pokemon['ivs'];
  size?: DisplayText;
  height?: number;
  weight?: number;
  displayValue?: DisplayText;
  score?: number;
}

export interface CompetitionResult {
  id: DisplayText;
  event_id: DisplayText;
  winners:
    | {
        first?: { player_name: DisplayText; score: number };
        second?: { player_name: DisplayText; score: number };
        third?: { player_name: DisplayText; score: number };
      }
    | PastCompetitionWinner[];
  ended_at: IsoDateString;
}

export interface WarStore {
  faction: FactionId | null;
  warCoins: number;
  weeklyPoints: number;
  mapDominance: Partial<Record<MapRouteId, DominanceInfo>>;
  dailyGuardianCaptures: MapRouteId[];
  addPoints: (
    mapId: MapRouteId,
    eventType: WarEventType,
    success: boolean,
    customPoints?: number
  ) => Promise<number>;
  claimGuardian: (mapId: MapRouteId, isDefeat?: boolean) => Promise<void>;
}

export interface PlayerClassStore {
  playerClass: PlayerClassId | null;
  classLevel: number;
  getModifier: (type: DisplayText, context?: Record<DisplayText, unknown>) => number;
  addCriminality: (amount: number) => void;
  addXP?: (amount: number) => void;
  onCaptureFail?: () => void;
  onCaptureSuccess?: () => void;
}

export interface AudioStore {
  play: (type: DisplayText) => Promise<void>;
}

export interface AuthStore {
  user: AuthUser | null;
  sessionMode: SessionMode;
  sessionId: DisplayText;
  isOnline: boolean;
  connectionLost: boolean;
  sessionConflict: boolean;
  logout: () => Promise<void>;
}
export const TRADE_CARD_MODES = ['incoming', 'outgoing', 'accepted'] as const;
export type TradeCardMode = (typeof TRADE_CARD_MODES)[number];

export const TRADE_OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'claimed'] as const;
export type TradeOfferStatus = (typeof TRADE_OFFER_STATUSES)[number];

export interface TradeOffer {
  id: DisplayText;
  sender_id: DisplayText;
  receiver_id: DisplayText;
  offer_pokemon: Pokemon | null;
  offer_items: Inventory;
  offer_money: number;
  request_pokemon: Pokemon | null;
  request_items: Inventory;
  request_money: number;
  message: DisplayText;
  status: TradeOfferStatus;
  created_at: IsoDateString;
}

export interface InventoryStore {
  addItem: (itemName: ItemId | DisplayText, qty?: number) => void;
  removeItem: (itemName: ItemId | DisplayText, qty?: number) => void;
}

export interface ShopStore {
  healAllPokemon: (cost?: number) => void;
}
