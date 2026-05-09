import { Pokemon, PokemonEgg } from './pokemon';
import type { DaycareMission } from './breeding';
import type { BattleState } from './battle';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  meta?: Record<string, unknown>;
}

export interface PokedexItem {
  id: string;
  dexNum: string;
  rawDexNum: number;
  name: string;
  isSeen: boolean;
  isCaught: boolean;
  spriteUrl: string | null;
}

export interface ClaimItem {
  id: string | number;
  type: 'pokemon' | 'item' | 'currency';
  asset_data: {
    type: 'pokemon' | 'item' | 'money';
    data: Record<string, unknown>;
  };
  source_type: string;
  source_id: string;
  created_at: string;
}

export interface GameState {
  trainer: string;
  badges: number;
  balls: number;
  money: number;
  battleCoins: number;
  eggs: PokemonEgg[];
  trainerChance: number;
  trainerLevel: number;
  trainerExp: number;
  trainerExpNeeded: number;
  inventory: Record<string, number>;
  map: {
    currentMap: string;
    region: string;
    lastNavigateAt: number;
  };
  team: Pokemon[];
  box: Pokemon[];
  pokedex: string[];
  seenPokedex: string[];
  defeatedGyms: string[];
  gymProgress: Record<string, { completed: boolean; attempts: number; lastWin?: number }>;
  lastGymWins: Record<string, number>;
  lastGymAttempts: Record<string, number>;
  battle: BattleState | null;
  starterChosen: boolean;
  lastRankedSeason: string | null;
  nick_style: string | null;
  avatar_style: string | null;
  stats: Record<string, number | string>;
  eloRating: number;
  pvpStats: { wins: number; losses: number; draws: number };
  rankedMaxElo: number;
  passiveTeamUids: string[];
  passiveTeamActive: boolean;
  rankedRewardsClaimed: string[];
  activeBattle: BattleState | null;
  daycare_missions: DaycareMission[];
  daycare_mission_refreshes: number;
  safariTicketSecs: number;
  ceruleanTicketSecs: number;
  articunoTicketSecs: number;
  mewtwoTicketSecs: number;
  repelSecs: number;
  shinyBoostSecs: number;
  amuletCoinSecs: number;
  luckyEggSecs: number;
  ivScannerSecs: number;
  incenseType: string | null;
  incenseSecs: number;
  daycare_berry_egg_time: number;
  boxCount: number;
  chats: Record<string, unknown>;
  playerClass: string | null;
  classLevel: number;
  classXP: number;
  classData: {
    captureStreak: number;
    longestStreak: number;
    reputation: number;
    blackMarketSales: number;
    criminality: number;
    blackMarketDaily: { date: string; items: unknown[]; purchased: unknown[] };
    activeMission?: unknown;
    extortedRouteId?: string | null;
    officialRouteId?: string | null;
    kitCaptures?: number;
  };
  faction: string | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Record<string, Record<string, number>>;
  warDailyCoins: Record<string, number>;
  warMyPtsLocal: Record<string, number>;
  warPointsAccumulator?: number;
  lastResolvedWeek?: string;
  notificationHistory: NotificationItem[];
  marketSoldSeenIds: string[];
  claimQueue: ClaimItem[];
  pvpTeam: string[];
  warTeam: string[];
  warSlots: number;
  isOverlayLoading?: boolean;
  overlayMessage?: string;
}
