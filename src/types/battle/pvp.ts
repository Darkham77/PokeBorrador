import type { DisplayText, AssetUri } from '@francogp/auditor';
import type { SideID } from '@pkmn/sim';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type LiveChannelHandle = Pick<RealtimeChannel, 'send' | 'unsubscribe'>;

const PVP_MATCH_TYPES = ['human', 'matched', 'passive_fallback'] as const;
export type PvPMatchType = (typeof PVP_MATCH_TYPES)[number];

import {
  SEASONAL_THEME_IDS,
  type SeasonalThemeId,
  type SeasonalRewardPokemonConfig,
  type SeasonalThemeConfig,
  isSeasonalThemeId,
  requireSeasonalThemeId,
  type RankedTierId
} from '@/data/system/rankedData.ts';
import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { BattleStages, BattleActionType } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

export const PVP_BATTLE_PHASES = [
  'sync',
  'choosing',
  'resolving',
  'animating',
  'faint_switch',
  'over',
  'waiting'
] as const;
export type PvPBattlePhase = (typeof PVP_BATTLE_PHASES)[number];

export interface PvPAction {
  type: BattleActionType;
  moveIndex?: number;
  switchIndex?: number;
  choiceString?: DisplayText;
}

export interface PvPBattleState {
  isHost: boolean;
  isRanked: boolean;
  phase: PvPBattlePhase;
  myTeam: Pokemon[];
  enemyTeam: Pokemon[];
  myActiveIdx: number;
  enemyActiveIdx: number;
  myHp: number[];
  enemyHp: number[];
  myStages: BattleStages;
  enemyStages: BattleStages;
  myPick: PvPAction | null;
  enemyPick: PvPAction | null;
  logs: DisplayText[];
}

export const PVP_TURN_TIMEOUT_SEC = 45 as const;
export const PVP_AFK_MAX_STRIKES = 2 as const;
export const PVP_RECONNECT_WINDOW_SEC = 60 as const;
export const MATCHMAKING_TIMEOUT_SEC = 60 as const;
export const FAST_MATCHMAKING_TIMEOUT_SEC = 5 as const;
export const MAX_PVP_SLOTS = 3 as const;
export const MAX_PVP6_SLOTS = 6 as const;

export const TEAM_MANAGEMENT_TABS = ['adventure', 'pvp', 'pvp6', 'war'] as const;
export type TeamManagementTab = (typeof TEAM_MANAGEMENT_TABS)[number];
export const PVP_TEAM_TABS = ['pvp', 'pvp6'] as const;
export type PvpTeamTab = (typeof PVP_TEAM_TABS)[number];
export { PVP_INVITE_EXPIRY_MS } from '@/logic/constants/gameplay';

export const PVP_MATCH_FORMATS = ['3v3', '6v6'] as const;
export type PvpMatchFormat = (typeof PVP_MATCH_FORMATS)[number];
const PVP_MATCH_FORMATS_SET: ReadonlySet<string> = new Set(PVP_MATCH_FORMATS);

export function isPvpMatchFormat(value: unknown): value is PvpMatchFormat {
  return typeof value === 'string' && PVP_MATCH_FORMATS_SET.has(value);
}

export function requirePvpMatchFormat(value: unknown): PvpMatchFormat {
  if (isPvpMatchFormat(value)) return value;
  throw new Error(`[PVP] Invalid match format: ${String(value)}`);
}

export const PVP_LEVEL_RULES = ['real', 'flat50'] as const;
export type PvpLevelRule = (typeof PVP_LEVEL_RULES)[number];
const PVP_LEVEL_RULES_SET: ReadonlySet<string> = new Set(PVP_LEVEL_RULES);

export function isPvpLevelRule(value: unknown): value is PvpLevelRule {
  return typeof value === 'string' && PVP_LEVEL_RULES_SET.has(value);
}

export function requirePvpLevelRule(value: unknown): PvpLevelRule {
  if (isPvpLevelRule(value)) return value;
  throw new Error(`[PVP] Invalid level rule: ${String(value)}`);
}

export const PVP_CHANNEL_EVENTS = [
  'pvp_ready',
  'pvp_team',
  'pvp_team_order',
  'pvp_pick',
  'pvp_turn_stream',
  'pvp_turn_result',
  'pvp_reconnect',
  'pvp_forfeit',
  'pvp_spectate_join',
  'pvp_spectate_sync'
] as const;
export type PvpChannelEvent = (typeof PVP_CHANNEL_EVENTS)[number];
const PVP_CHANNEL_EVENTS_SET: ReadonlySet<string> = new Set(PVP_CHANNEL_EVENTS);

export function isPvpChannelEvent(value: unknown): value is PvpChannelEvent {
  return typeof value === 'string' && PVP_CHANNEL_EVENTS_SET.has(value);
}

export type PvpRoomCode = string & { readonly __brand: unique symbol };

export const PVP_INVITE_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'cancelled_offline',
  'expired',
  'ranked_match',
  'ranked_accepted'
] as const;
export type PvpInviteStatus = (typeof PVP_INVITE_STATUSES)[number];
const PVP_INVITE_STATUSES_SET: ReadonlySet<string> = new Set(PVP_INVITE_STATUSES);

export function isPvpInviteStatus(value: unknown): value is PvpInviteStatus {
  return typeof value === 'string' && PVP_INVITE_STATUSES_SET.has(value);
}

export const PVP_AFK_REASONS = ['timeout', 'forfeit', 'disconnected'] as const;
export type PvpAfkReason = (typeof PVP_AFK_REASONS)[number];
const PVP_AFK_REASONS_SET: ReadonlySet<string> = new Set(PVP_AFK_REASONS);

export function isPvpAfkReason(value: unknown): value is PvpAfkReason {
  return typeof value === 'string' && PVP_AFK_REASONS_SET.has(value);
}

export const PVP_MATCH_MODES = ['ranked', 'casual'] as const;
export type PvpMatchMode = (typeof PVP_MATCH_MODES)[number];
const PVP_MATCH_MODES_SET: ReadonlySet<string> = new Set(PVP_MATCH_MODES);

export function isPvpMatchMode(value: unknown): value is PvpMatchMode {
  return typeof value === 'string' && PVP_MATCH_MODES_SET.has(value);
}

export function requirePvpMatchMode(value: unknown): PvpMatchMode {
  if (isPvpMatchMode(value)) return value;
  throw new Error(`[PVP] Invalid match mode: ${String(value)}`);
}

export interface PvpArenaConfig {
  gymId?: GymId;
  locationId?: MapRouteId;
}

export interface PvpChallengeConfig {
  format: PvpMatchFormat;
  levelRule: PvpLevelRule;
  arena: PvpArenaConfig;
  mode?: PvpMatchMode;
  isAsynchronous?: boolean;
}

export interface BattleInvite {
  id: DisplayText;
  sender_id: DisplayText;
  challenger_id?: DisplayText;
  opponent_id: DisplayText;
  status: PvpInviteStatus;
  created_at: DisplayText;
  config?: PvpChallengeConfig;
}

import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

export interface RankedSeasonRulesConfig {
  name: DisplayText;
  season_name?: DisplayText;
  startDate?: DisplayText;
  endDate?: DisplayText;
  levelCap?: number;
  maxPokemon?: number;
  allowedTypes?: PokemonType[];
  bannedPokemonIds?: PokemonSpeciesId[];
  themeId?: SeasonalThemeId;
  themeName?: DisplayText;
  themeDescription?: DisplayText;
  last_awarded_at?: DisplayText;
}

export const PASSIVE_BATTLE_RESULTS = ['victory', 'defeat'] as const;
export type PassiveBattleResult = (typeof PASSIVE_BATTLE_RESULTS)[number];

export const SOCIAL_RANKINGS_TABS = ['season', 'leaderboard', 'podium', 'theater'] as const;
export type SocialRankingsTab = (typeof SOCIAL_RANKINGS_TABS)[number];
const SOCIAL_RANKINGS_TABS_SET: ReadonlySet<string> = new Set(SOCIAL_RANKINGS_TABS);

export function isSocialRankingsTab(value: unknown): value is SocialRankingsTab {
  return typeof value === 'string' && SOCIAL_RANKINGS_TABS_SET.has(value);
}

export {
  SEASONAL_THEME_IDS,
  type SeasonalThemeId,
  type SeasonalRewardPokemonConfig,
  type SeasonalThemeConfig,
  isSeasonalThemeId,
  requireSeasonalThemeId
};

export type BattleCode = string & { readonly __brand: unique symbol };

export function isBattleCode(value: unknown): value is BattleCode {
  return typeof value === 'string' && /^BTL-[A-Z0-9]{4}-[A-Z0-9]{3,4}$/.test(value);
}

export function requireBattleCode(value: unknown): BattleCode {
  if (isBattleCode(value)) return value;
  throw new Error(`[PVP] Invalid battle code format: ${String(value)}`);
}

export interface ReplayCombatantPokemonSummary {
  id: PokemonSpeciesId;
  name: DisplayText;
  level: number;
  sprite: AssetUri;
  revealedMoves: DisplayText[];
  revealedItem?: DisplayText;
  revealedAbility?: DisplayText;
}

export interface ReplayCombatantSummary {
  userId: DisplayText;
  username: DisplayText;
  tier: RankedTierId;
  elo: number;
  avatar?: AssetUri;
  team: ReplayCombatantPokemonSummary[];
}

export interface ReplayChoiceStep {
  turnNumber: number;
  p1Choice: DisplayText;
  p2Choice: DisplayText;
  logLines: DisplayText[];
}

export interface BattleReplayRecord {
  id: DisplayText;
  battleCode: BattleCode;
  seasonId: DisplayText;
  themeId: SeasonalThemeId;
  p1: ReplayCombatantSummary;
  p2: ReplayCombatantSummary;
  turnsCount: number;
  winnerSide: SideID;
  choiceStream: ReplayChoiceStep[];
  initialSeed: [number, number, number, number];
  isTop10Archived: boolean;
  viewsCount: number;
  createdAt: DisplayText;
}

export const MAX_PERSONAL_MATCH_HISTORY = 20;

export const PERSONAL_PVP_MATCH_RESULTS = ['victory', 'defeat', 'draw'] as const;
export type PersonalPvPMatchResult = (typeof PERSONAL_PVP_MATCH_RESULTS)[number];

export interface PersonalPvPMatchSummary {
  readonly id: DisplayText;
  readonly battleCode: BattleCode;
  readonly opponentId: DisplayText;
  readonly opponentName: DisplayText;
  readonly opponentAvatar?: AssetUri;
  readonly format: PvpMatchFormat;
  readonly isRanked: boolean;
  readonly result: PersonalPvPMatchResult;
  readonly deltaElo?: number;
  readonly turnsCount: number;
  readonly timestamp: DisplayText;
}

export function appendPersonalMatchHistory(
  history: readonly PersonalPvPMatchSummary[] | undefined,
  newMatch: PersonalPvPMatchSummary
): PersonalPvPMatchSummary[] {
  const current = history || [];
  const filtered = current.filter(
    (m) => m.battleCode !== newMatch.battleCode && m.id !== newMatch.id
  );
  return [newMatch, ...filtered].slice(0, MAX_PERSONAL_MATCH_HISTORY);
}

export interface PassiveBattleReportData {
  opponent?: DisplayText;
  turns?: number;
  endedAt?: DisplayText;
  deltaElo?: number;
  faction?: DisplayText;
  playerClass?: DisplayText;
}

export interface PassiveOpponentProfile {
  id?: DisplayText;
  username?: DisplayText;
  playerClass?: DisplayText | null;
  level?: number | null;
  trainer_level?: number | null;
  avatar?: AssetUri | null;
  avatarFrame?: AssetUri | null;
  avatarDecor?: AssetUri | null;
  avatar_style?: AssetUri | null;
  avatarStyle?: AssetUri | null;
  nick_style?: AssetUri | null;
  faction?: DisplayText | null;
  elo_rating?: number | null;
  gender?: DisplayText | null;
}

export interface PassiveBattleReport {
  id: DisplayText;
  user_id: DisplayText;
  opponent_id: DisplayText;
  result: PassiveBattleResult;
  report_data: PassiveBattleReportData;
  opponent_profile?: PassiveOpponentProfile | null;
  created_at: DisplayText;
}

export interface PvPStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface SeasonRules {
  name: DisplayText;
  startDate?: DisplayText;
  endDate?: DisplayText;
  seasonStartDate?: DisplayText;
  seasonEndDate?: DisplayText;
  bannedPokemonIds?: PokemonSpeciesId[];
  levelCap: number;
  allowedTypes?: DisplayText[];
  maxPokemon: number;
  themeName?: DisplayText;
  isLittleCup?: boolean;
}

export interface RankedSeasonMedal {
  id: DisplayText;
  seasonName: DisplayText;
  tournamentName?: DisplayText;
  themeId?: SeasonalThemeId;
  tier: RankedTierId;
  rank?: number;
  finalElo: number;
  awardedAt: DisplayText;
}

export interface PvpTurnPayload {
  turnNumber: number;
  choice: DisplayText;
}

export interface PvpTurnStreamPayload {
  turnNumber: number;
  turn?: number;
  streamLines: DisplayText[];
  over?: boolean;
  winnerSide?: SideID;
}

export interface PvpForfeitPayload {
  actorSide: SideID;
  reason: PvpAfkReason;
}

export interface PvpReconnectPayload {
  matchId: DisplayText;
  side: SideID;
  lastTurnNumber: number;
}

export interface RankedPodiumWinner {
  rank: number;
  user_id: DisplayText;
  username: DisplayText;
  elo: number;
  tier: RankedTierId;
}
