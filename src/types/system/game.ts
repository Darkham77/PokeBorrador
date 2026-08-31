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

export type ToolQualityTier = 'standard' | 'good' | 'super';

export interface NotificationItem {
  id: string; // domain-ok
  type: string; // domain-ok
  title: string; // domain-ok
  message: string; // domain-ok
  timestamp: number;
  read: boolean;
  meta?: Record<string, unknown>; // open-record
}

export interface PokedexItem {
  id: PokemonSpeciesId;
  dexNum: string; // domain-ok
  rawDexNum: number;
  name: string; // domain-ok
  isSeen: boolean;
  isCaught: boolean;
  spriteUrl: string | null; // domain-ok
}

export interface ClaimItem {
  id: string | number; // domain-ok
  user_id?: string; // domain-ok
  type?: 'pokemon' | 'item' | 'currency';
  asset_data: {
    type: MarketAssetType;
    data: unknown; // open-record
  };
  source_type: string; // domain-ok
  source_id: string; // domain-ok
  created_at: string; // domain-ok
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


const FACTION_IDS = ['union', 'poder'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export function isFactionId(value: unknown): value is FactionId {
  return typeof value === 'string' && (FACTION_IDS as readonly string[]).includes(value); // domain-ok
}

export function requireFactionId(value: string): FactionId {
  if (isFactionId(value)) return value;
  throw new Error(`Invalid faction id: ${value}`);
}

export type { PlayerClassId } from '@/data/player/playerClasses';

const GENDER_IDS = ['h', 'm'] as const;
export type GenderId = (typeof GENDER_IDS)[number];

export function isGenderId(value: unknown): value is GenderId {
  return typeof value === 'string' && (GENDER_IDS as readonly string[]).includes(value); // domain-ok
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
  trainer: string; // domain-ok
  gender?: GenderId;
  last_renamed_at?: string; // domain-ok
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
    region: string; // domain-ok
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
  lastRankedSeason: string | null; // domain-ok
  nick_style: string | null; // domain-ok
  avatar_style: string | null; // domain-ok
  stats: Partial<Record<GameStatKey, number>>;
  guardianCaptures?: Partial<Record<MapRouteId, ISODateKey>>;
  eloRating: number;
  pvpStats: { wins: number; losses: number; draws: number };
  rankedMaxElo: number;
  passiveTeamUids: string[]; // domain-ok
  passiveTeamActive: boolean;
  rankedRewardsClaimed: string[]; // domain-ok
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
  chats: Record<string, unknown>; // open-record
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
    extortedRouteTimestamp?: string | null; // domain-ok
    lastEggScanDate?: string | null; // domain-ok
    officialRouteId?: MapRouteId | null;
    officialRouteTimestamp?: string | null; // domain-ok
    kitCaptures?: number;
  };
  faction: FactionId | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Partial<Record<ISODateKey, Partial<Record<MapRouteId, number>>>>;
  warDailyCoins: Partial<Record<ISODateKey, number>>;
  warMyPtsLocal: Partial<Record<MapRouteId, number>>;
  warPointsAccumulator?: number;
  lastResolvedWeek?: string; // domain-ok
  notificationHistory: NotificationItem[];
  marketSoldSeenIds: string[]; // domain-ok
  claimQueue: ClaimItem[];
  pvpTeam: string[]; // domain-ok
  warTeam: string[]; // domain-ok
  warSlots: number;
  isOverlayLoading?: boolean;
  overlayMessage?: string; // domain-ok
}
