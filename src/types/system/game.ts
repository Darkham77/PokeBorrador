import { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon';
import type { DaycareMission } from '@/types/breeding/breeding';
import type { BattleState } from '@/types/battle/battle';
import type { Inventory } from '@/types/inventory/items';
import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { ItemId } from '@/data/inventory/items';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { MarketAssetType } from '@/logic/economy/market';

export const TOOL_QUALITY_TIERS = ['standard', 'good', 'super'] as const;
export type ToolQualityTier = (typeof TOOL_QUALITY_TIERS)[number];

export const CLAIM_ITEM_TYPES = ['pokemon', 'item', 'currency'] as const;
export type ClaimItemType = (typeof CLAIM_ITEM_TYPES)[number];

export const TRAINER_ASSET_VIEWS = ['avatar', 'front', 'back'] as const;
export type TrainerAssetView = (typeof TRAINER_ASSET_VIEWS)[number];

export const COMPONENT_PILL_SIZES = ['ssm', 'sm', 'md', 'lg'] as const;
export type ComponentPillSize = (typeof COMPONENT_PILL_SIZES)[number];

export interface NotificationItem {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  type: string; // domain-ok: Open dynamic text or non-domain string payload
  title: string; // domain-ok: Open dynamic text or non-domain string payload
  message: string; // domain-ok: Open dynamic text or non-domain string payload
  timestamp: number;
  read: boolean;
  meta?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

export interface PokedexItem {
  id: PokemonSpeciesId;
  dexNum: string; // domain-ok: Open dynamic text or non-domain string payload
  rawDexNum: number;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  isSeen: boolean;
  isCaught: boolean;
  spriteUrl: string | null; // domain-ok: Open dynamic text or non-domain string payload
}

export interface ClaimItem {
  id: string | number; // domain-ok: Open dynamic text or non-domain string payload
  user_id?: string; // domain-ok: Open dynamic text or non-domain string payload
  type?: ClaimItemType;
  asset_data: {
    type: MarketAssetType;
    data: unknown; // open-record: Generic key-value data dictionary container
  };
  source_type: string; // domain-ok: Open dynamic text or non-domain string payload
  source_id: string; // domain-ok: Open dynamic text or non-domain string payload
  created_at: string; // domain-ok: Open dynamic text or non-domain string payload
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

export type { PlayerClassId } from '@/data/player/playerClasses';

const GENDER_IDS = ['h', 'm'] as const;
export type GenderId = (typeof GENDER_IDS)[number];
const GENDER_IDS_SET: ReadonlySet<string> = new Set(GENDER_IDS);

export function isGenderId(value: unknown): value is GenderId {
  return typeof value === 'string' && GENDER_IDS_SET.has(value);
}

export function requireGenderId(value: unknown, fallback: GenderId = 'h'): GenderId {
  return isGenderId(value) ? value : fallback;
}
export type AdventureMinigameType = 'archaeology' | 'fishing';
export type LowPowerModeSetting = 'auto' | 'enabled' | 'disabled';
export type SortOrder = 'asc' | 'desc';
export type ItemSortKey = 'name' | 'price' | 'rarity';
export type PillFxType = 'glow' | 'drift' | 'shake' | '';

export interface GameState {
  trainer: string; // domain-ok: Open dynamic text or non-domain string payload
  gender?: GenderId;
  last_renamed_at?: string; // domain-ok: Open dynamic text or non-domain string payload
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
    region: string; // domain-ok: Open dynamic text or non-domain string payload
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
  lastRankedSeason: string | null; // domain-ok: Open dynamic text or non-domain string payload
  nick_style: string | null; // domain-ok: Open dynamic text or non-domain string payload
  avatar_style: string | null; // domain-ok: Open dynamic text or non-domain string payload
  stats: Partial<Record<GameStatKey, number>>;
  guardianCaptures?: Partial<Record<MapRouteId, ISODateKey>>;
  eloRating: number;
  pvpStats: { wins: number; losses: number; draws: number };
  rankedMaxElo: number;
  passiveTeamUids: string[]; // domain-ok: Open dynamic text or non-domain string payload
  passiveTeamActive: boolean;
  rankedRewardsClaimed: string[]; // domain-ok: Open dynamic text or non-domain string payload
  activeBattle: BattleState | null;
  daycare_missions: DaycareMission[];
  daycare_mission_refreshes: number;
  safariTicketSecs: number;
  ceruleanTicketSecs: number;
  articunoTicketSecs: number;
  mewtwoTicketSecs: number;
  repelSecs: number;
  fishingRodSecs: number;
  fishingRodType: ToolQualityTier | null;
  pickaxeSecs: number;
  pickaxeType: ToolQualityTier | null;
  brushSecs: number;
  brushType: ToolQualityTier | null;
  shinyBoostSecs: number;
  amuletCoinSecs: number;
  luckyEggSecs: number;
  ivScannerSecs: number;
  incenseType: ItemId | null;
  incenseSecs: number;
  daycare_berry_egg_time: number;
  daycareWarehouse?: unknown[];
  boxCount: number;
  chats: Record<string, unknown>; // open-record: Generic key-value data dictionary container
  playerClass: PlayerClassId | null;
  classLevel: number;
  classXP: number;
  classData: {
    captureStreak: number;
    longestStreak: number;
    reputation: number;
    blackMarketSales: number;
    criminality: number;
    blackMarketDaily: { date: string; items: ItemId[]; purchased: ItemId[] };
    activeMission?: unknown;
    extortedRouteId?: MapRouteId | null;
    extortedRouteTimestamp?: string | null; // domain-ok: Open dynamic text or non-domain string payload
    lastEggScanDate?: string | null; // domain-ok: Open dynamic text or non-domain string payload
    officialRouteId?: MapRouteId | null;
    officialRouteTimestamp?: string | null; // domain-ok: Open dynamic text or non-domain string payload
    kitCaptures?: number;
  };
  faction: FactionId | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Partial<Record<ISODateKey, Partial<Record<MapRouteId, number>>>>;
  warDailyCoins: Partial<Record<ISODateKey, number>>;
  warMyPtsLocal: Partial<Record<MapRouteId, number>>;
  warPointsAccumulator?: number;
  lastResolvedWeek?: string; // domain-ok: Open dynamic text or non-domain string payload
  notificationHistory: NotificationItem[];
  marketSoldSeenIds: string[]; // domain-ok: Open dynamic text or non-domain string payload
  claimQueue: ClaimItem[];
  pvpTeam: string[]; // domain-ok: Open dynamic text or non-domain string payload
  warTeam: string[]; // domain-ok: Open dynamic text or non-domain string payload
  warSlots: number;
  isOverlayLoading?: boolean;
  overlayMessage?: string; // domain-ok: Open dynamic text or non-domain string payload
}
