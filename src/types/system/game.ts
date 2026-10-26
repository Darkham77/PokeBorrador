import type { AssetUri, DisplayText, IsoDateString } from '@francogp/auditor';

import type { ItemId } from '@/data/inventory/items';
import type { PlayerClassId, MissionId } from '@/data/player/playerClasses';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { MarketAssetType } from '@/logic/economy/market';
import type { BattleState } from '@/types/battle/battle';
import type { RankedSeasonMedal, PersonalPvPMatchSummary } from '@/types/battle/pvp';
import type { DaycareMission, DaycareWarehouseItem } from '@/types/breeding/breeding';
import type { Inventory } from '@/types/inventory/items';
import type { GatheringToolTier } from '@/types/pokemon/encounters';
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon';

export const CLAIM_ITEM_TYPES = ['pokemon', 'item', 'currency'] as const;
export type ClaimItemType = (typeof CLAIM_ITEM_TYPES)[number];

export const TRAINER_ASSET_VIEWS = ['avatar', 'front', 'back'] as const;
export type TrainerAssetView = (typeof TRAINER_ASSET_VIEWS)[number];

export const COMPONENT_PILL_SIZES = ['ssm', 'sm', 'md', 'lg'] as const;
export type ComponentPillSize = (typeof COMPONENT_PILL_SIZES)[number];

export const CARDINAL_DIRECTIONS = ['left', 'top', 'bottom', 'right'] as const;
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export interface NotificationItem {
  id: DisplayText;
  type: DisplayText;
  title: DisplayText;
  message: DisplayText;
  timestamp: number;
  read: boolean;
  meta?: Record<DisplayText, unknown>;
}

export interface PokedexItem {
  id: PokemonSpeciesId;
  dexNum: DisplayText;
  rawDexNum: number;
  name: DisplayText;
  isSeen: boolean;
  isCaught: boolean;
  spriteUrl: AssetUri | null;
}

export interface ClaimItem {
  id: DisplayText | number;
  user_id?: DisplayText;
  type?: ClaimItemType;
  asset_data: {
    type: MarketAssetType;
    data: unknown;
    sold_item?: { name?: DisplayText; qty?: number };
    sold_pokemon?: { name?: DisplayText; level?: number; isShiny?: boolean };
  };
  source_type: DisplayText;
  source_id: DisplayText;
  created_at: IsoDateString;
}

export interface GymProgressEntry {
  easy: boolean;
  normal: boolean;
  hard: boolean;
  attempts: number;
  lastWin?: number;
}

export type ISODateKey = `${number}-${number}-${number}`;

function isISODateKey(value: string): value is ISODateKey {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function requireISODateKey(value: string): ISODateKey {
  if (isISODateKey(value)) return value;
  throw new Error(`Invalid ISO date key: ${value}`);
}

export type GameStatKey =
  | 'captureAttempts'
  | 'captureSuccesses'
  | 'eventMedalsFirst'
  | 'eventMedalsSecond'
  | 'eventMedalsThird'
  | 'eventMedalsTotal'
  | 'eventParticipations'
  | 'longestStreak'
  | 'maxDamage'
  | 'shinyCount'
  | 'totalBattles'
  | 'tradeVolume'
  | 'trainersDefeated'
  | 'wins';

export const FACTION_IDS = ['union', 'poder'] as const;
export type FactionId = (typeof FACTION_IDS)[number];
const FACTION_IDS_SET: ReadonlySet<string> = new Set(FACTION_IDS);

export function isFactionId(value: unknown): value is FactionId {
  return typeof value === 'string' && FACTION_IDS_SET.has(value);
}

export function requireFactionId(value: string): FactionId {
  if (isFactionId(value)) return value;
  throw new Error(`Invalid faction id: ${value}`);
}

export const FACTION_LABELS: Readonly<Record<FactionId, string>> = Object.freeze({
  union: 'Equipo Unión',
  poder: 'Equipo Poder'
});

const NIL_FACTION_STRING_VALUES = ['null', 'NULL', 'undefined'] as const;
export const NIL_FACTION_STRINGS: ReadonlySet<string> = new Set(NIL_FACTION_STRING_VALUES);

export const FACTION_COLORS: Readonly<Record<FactionId, string>> = Object.freeze({
  union: 'rgba(59, 130, 246, 1)',
  poder: 'rgba(239, 68, 68, 1)'
});

export const PODIUM_MEDALS = ['🥇', '🥈', '🥉'] as const;

export type { PlayerClassId } from '@/data/player/playerClasses';

const GENDER_IDS = ['h', 'm'] as const;
export type GenderId = (typeof GENDER_IDS)[number];
const GENDER_IDS_SET: ReadonlySet<string> = new Set(GENDER_IDS);

export function isGenderId(value: unknown): value is GenderId {
  return typeof value === 'string' && GENDER_IDS_SET.has(value);
}

export const DEFAULT_GENDER: GenderId = 'h';
export const DEFAULT_TRAINER_NAME = 'Entrenador' as const;
export const DEFAULT_TRAINER_LEVEL = 1 as const;

export function requireGenderId(value: unknown, fallback: GenderId = DEFAULT_GENDER): GenderId {
  return isGenderId(value) ? value : fallback;
}
export type LowPowerModeSetting = 'auto' | 'enabled' | 'disabled';
export type SortOrder = 'asc' | 'desc';
export type ItemSortKey = 'name' | 'price' | 'rarity';
const _RANKING_SORT_KEYS = ['elo_rating', 'trainer_level', 'badges'] as const;
export type RankingSortKey = (typeof _RANKING_SORT_KEYS)[number];
export type PillFxType = 'glow' | 'drift' | 'shake' | '';

export interface GameState {
  trainer: DisplayText;
  gender?: GenderId;
  last_renamed_at?: IsoDateString;
  playtime?: number;
  badges: number;
  balls: number;
  money: number;
  battleCoins: number;
  eggs: PokemonEgg[];
  trainerChance: number;
  trainerLevel: number;
  trainerExp: number;
  trainerExpNeeded: number;
  inventory: Inventory;
  map: {
    currentMap: MapRouteId;
    region: DisplayText;
    lastNavigateAt: number;
  };
  team: Pokemon[];
  box: (Pokemon | null)[];
  pokedex: PokemonSpeciesId[];
  seenPokedex: PokemonSpeciesId[];
  defeatedGyms: GymId[];
  gymProgress: Partial<Record<GymId, GymProgressEntry>>;
  lastGymWins: Partial<Record<GymId, number>>;
  lastGymAttempts: Partial<Record<GymId, number>>;
  battle: BattleState | null;
  starterChosen: boolean;
  lastPokemonCenterHeal?: number;
  lastRankedSeason: DisplayText | null;
  rankedMedals?: RankedSeasonMedal[];
  nick_style: DisplayText | null;
  avatar_style: DisplayText | null;
  stats: Partial<Record<GameStatKey, number>>;
  guardianCaptures?: Partial<Record<MapRouteId, ISODateKey>>;
  eloRating: number;
  pvpStats: { wins: number; losses: number; draws: number };
  rankedMaxElo: number;
  passiveTeamUids: DisplayText[];
  passiveTeamActive: boolean;
  rankedRewardsClaimed: DisplayText[];
  activeBattle: BattleState | null;
  daycare_missions: DaycareMission[];
  daycare_mission_refreshes: number;
  safariTicketSecs: number;
  ceruleanTicketSecs: number;
  articunoTicketSecs: number;
  mewtwoTicketSecs: number;
  repelSecs: number;
  fishingRodSecs: number;
  fishingRodType: GatheringToolTier | null;
  pickaxeSecs: number;
  pickaxeType: GatheringToolTier | null;
  brushSecs: number;
  brushType: GatheringToolTier | null;
  shinyBoostSecs: number;
  amuletCoinSecs: number;
  luckyEggSecs: number;
  ivScannerSecs: number;
  incenseType: ItemId | null;
  incenseSecs: number;
  daycare_berry_egg_time: number;
  daycareWarehouse?: DaycareWarehouseItem[];
  boxCount: number;
  chats: Record<DisplayText, unknown>;
  playerClass: PlayerClassId | null;
  classLevel: number;
  classXP: number;
  classData: PlayerClassState;
  faction: FactionId | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Partial<Record<ISODateKey, Partial<Record<MapRouteId, number>>>>;
  warDailyCoins: Partial<Record<ISODateKey, number>>;
  warMyPtsLocal: Partial<Record<MapRouteId, number>>;
  warPointsAccumulator?: number;
  lastResolvedWeek?: DisplayText;
  notificationHistory: NotificationItem[];
  marketSoldSeenIds: DisplayText[];
  claimQueue: ClaimItem[];
  pvpTeam: DisplayText[];
  pvpTeam6: DisplayText[];
  pvpMatchHistory?: PersonalPvPMatchSummary[];
  lastResolvedSeasonId?: DisplayText;
  dailyGymRematches?: Partial<Record<GymId, IsoDateString>>;
  warTeam: DisplayText[];
  warSlots: number;
  isOverlayLoading?: boolean;
  overlayMessage?: DisplayText;
}

export interface ActiveMission {
  readonly id: MissionId;
  readonly startedAt: number;
  readonly endsAt: number;
  readonly targetPokemonUid?: DisplayText;
  readonly targetPokemonIdx?: number;
  readonly targetPokemonSpecies?: PokemonSpeciesId;
  readonly targetZone?: DisplayText;
  readonly streak?: number;
  readonly projectedReward?: number;
  readonly rewards?: Partial<Record<ItemId | 'money' | 'battleCoins', number>>;
}

export interface PlayerClassState {
  captureStreak: number;
  longestStreak: number;
  reputation: number;
  blackMarketSales: number;
  criminality: number;
  blackMarketDaily: { date: IsoDateString; items: ItemId[]; purchased: ItemId[] };
  activeMission?: ActiveMission | null;
  extortedRouteId?: MapRouteId | null;
  extortedRouteTimestamp?: IsoDateString | null;
  lastEggScanDate?: IsoDateString | null;
  officialRouteId?: MapRouteId | null;
  officialRouteTimestamp?: IsoDateString | null;
  kitCaptures?: number;
}

/**
 * Ephemeral runtime properties on GameState that are NOT intended to be persisted in save_data.
 */
export type EphemeralGameStateKeys = 'battle' | 'isOverlayLoading' | 'overlayMessage';

/**
 * Authoritative set of persisted keys in GameState.
 */
export type PersistedGameState = Omit<GameState, EphemeralGameStateKeys>;
