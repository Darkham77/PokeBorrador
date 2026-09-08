import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { SideID } from '@pkmn/sim';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, BattleActionType } from '@/types/battle/battle';
import {
  SEASONAL_THEME_IDS,
  type SeasonalThemeId,
  type SeasonalRewardPokemonConfig,
  type SeasonalThemeConfig,
  isSeasonalThemeId,
  requireSeasonalThemeId,
  type RankedTierId
} from '@/data/system/rankedData.ts';

export const PVP_BATTLE_PHASES = ['sync', 'team_preview', 'choosing', 'resolving', 'animating', 'faint_switch', 'over', 'waiting'] as const;
export type PvPBattlePhase = (typeof PVP_BATTLE_PHASES)[number];

export interface PvPAction {
  type: BattleActionType;
  moveIndex?: number;
  switchIndex?: number;
  choiceString?: string; // domain-ok: Open dynamic text or non-domain string payload
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
  logs: string[]; // domain-ok: Open dynamic text or non-domain string payload
}

export const PVP_TURN_TIMEOUT_SEC = 45 as const;
export const PVP_AFK_MAX_STRIKES = 2 as const;
export const PVP_RECONNECT_WINDOW_SEC = 60 as const;
export const MATCHMAKING_TIMEOUT_SEC = 60 as const;
export const MAX_PVP_SLOTS = 3 as const;
export const MAX_PVP6_SLOTS = 6 as const;

export const TEAM_MANAGEMENT_TABS = ['adventure', 'pvp', 'pvp6', 'war'] as const;
export type TeamManagementTab = (typeof TEAM_MANAGEMENT_TABS)[number];
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
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  sender_id: string; // domain-ok: Open dynamic text or non-domain string payload
  challenger_id?: string; // domain-ok: Open dynamic text or non-domain string payload
  opponent_id: string; // domain-ok: Open dynamic text or non-domain string payload
  status: PvpInviteStatus;
  created_at: string; // domain-ok: Open dynamic text or non-domain string payload
  config?: PvpChallengeConfig;
}

import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

export interface RankedSeasonRulesConfig {
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  season_name?: string; // domain-ok: Open dynamic text or non-domain string payload
  startDate?: string; // domain-ok: Open dynamic text or non-domain string payload
  endDate?: string; // domain-ok: Open dynamic text or non-domain string payload
  levelCap?: number;
  maxPokemon?: number;
  allowedTypes?: PokemonType[];
  bannedPokemonIds?: PokemonSpeciesId[];
  themeId?: SeasonalThemeId;
  themeName?: string; // domain-ok: Open dynamic text or non-domain string payload
  themeDescription?: string; // domain-ok: Open dynamic text or non-domain string payload
  last_awarded_at?: string; // domain-ok: Open dynamic text or non-domain string payload
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
  requireSeasonalThemeId,
  type RankedTierId
};

export type BattleCode = string & { readonly __brand: unique symbol };

export function isBattleCode(value: unknown): value is BattleCode {
  return typeof value === 'string' && /^BTL-[A-Z0-9]{4}-[A-Z0-9]{3,4}$/.test(value);
}

export function requireBattleCode(value: unknown): BattleCode {
  if (isBattleCode(value)) return value as BattleCode;
  throw new Error(`[PVP] Invalid battle code format: ${String(value)}`);
}

export interface ReplayCombatantPokemonSummary {
  species: PokemonSpeciesId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  level: number;
  sprite: string; // domain-ok: Asset path URI string
  revealedMoves: string[]; // domain-ok: Moves revealed via fog of war
  revealedItem?: string; // domain-ok: Item revealed via fog of war
  revealedAbility?: string; // domain-ok: Ability revealed via fog of war
}

export interface ReplayCombatantSummary {
  userId: string; // domain-ok: Open dynamic text or non-domain string payload
  username: string; // domain-ok: Open dynamic text or non-domain string payload
  tier: RankedTierId;
  elo: number;
  avatar?: string; // domain-ok: Asset path URI string
  team: ReplayCombatantPokemonSummary[];
}

export interface ReplayChoiceStep {
  turnNumber: number;
  p1Choice: string; // domain-ok: Choice string
  p2Choice: string; // domain-ok: Choice string
  logLines: string[]; // domain-ok: Battle log output for turn
}

export interface BattleReplayRecord {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  battleCode: BattleCode;
  seasonId: string; // domain-ok: Open dynamic text or non-domain string payload
  themeId: SeasonalThemeId;
  p1: ReplayCombatantSummary;
  p2: ReplayCombatantSummary;
  turnsCount: number;
  winnerSide: SideID;
  choiceStream: ReplayChoiceStep[];
  initialSeed: [number, number, number, number];
  isTop10Archived: boolean;
  viewsCount: number;
  createdAt: string; // domain-ok: Open dynamic text or non-domain string payload
}

export const MAX_PERSONAL_MATCH_HISTORY = 20;

export interface PersonalPvPMatchSummary {
  readonly id: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly battleCode: BattleCode;
  readonly opponentId: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly opponentName: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly opponentAvatar?: string; // domain-ok: Asset path URI string
  readonly format: PvpMatchFormat;
  readonly isRanked: boolean;
  readonly result: 'victory' | 'defeat' | 'draw';
  readonly deltaElo?: number;
  readonly turnsCount: number;
  readonly timestamp: string; // domain-ok: ISO date string
}

export function appendPersonalMatchHistory(
  history: readonly PersonalPvPMatchSummary[] | undefined,
  newMatch: PersonalPvPMatchSummary
): PersonalPvPMatchSummary[] {
  const current = history || [];
  const filtered = current.filter(m => m.battleCode !== newMatch.battleCode && m.id !== newMatch.id);
  return [newMatch, ...filtered].slice(0, MAX_PERSONAL_MATCH_HISTORY);
}

export interface PassiveBattleReport {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  user_id: string; // domain-ok: Open dynamic text or non-domain string payload
  opponent_id: string; // domain-ok: Open dynamic text or non-domain string payload
  opponent_name?: string; // domain-ok: Open dynamic text or non-domain string payload
  result: PassiveBattleResult;
  delta_elo: number;
  created_at: string; // domain-ok: Open dynamic text or non-domain string payload
}

export interface RankedSeasonMedal {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  seasonName: string; // domain-ok: Open dynamic text or non-domain string payload
  tournamentName?: string; // domain-ok: Open dynamic text or non-domain string payload
  themeId?: SeasonalThemeId;
  tier: RankedTierId;
  rank?: number;
  finalElo: number;
  awardedAt: string; // domain-ok: Open dynamic text or non-domain string payload
}

export interface PvpTurnPayload {
  turnNumber: number;
  choice: string; // domain-ok: Open dynamic text or non-domain string payload
}

export interface PvpTurnStreamPayload {
  turnNumber: number;
  turn?: number;
  streamLines: string[]; // domain-ok: Open dynamic text or non-domain string payload
  over?: boolean;
  winnerSide?: SideID;
}

export interface PvpForfeitPayload {
  actorSide: SideID;
  reason: PvpAfkReason;
}

export interface PvpReconnectPayload {
  matchId: string; // domain-ok: Open dynamic text or non-domain string payload
  side: SideID;
  lastTurnNumber: number;
}

export interface RankedPodiumWinner {
  rank: number;
  user_id: string; // domain-ok: Open dynamic text or non-domain string payload
  username: string; // domain-ok: Open dynamic text or non-domain string payload
  elo: number;
  tier: RankedTierId;
}
