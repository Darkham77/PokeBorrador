/**
 * src/components/modals/trainerProfileResolver.ts
 *
 * Pure helper functions for resolving trainer profile values across local store,
 * cached cosmetics, friends list, and fetched profile/save data.
 */

import type { RankedSeasonMedal, BattleReplayRecord, BattleCode } from '@/types/battle/pvp.ts'
import type { SideID } from '@pkmn/sim'
import { isRankedTierId, isSeasonalThemeId } from '@/data/system/rankedData.ts'
import { POKEMON_COMPETITION_RANKS, type PokemonCompetitionRank } from '@/types/pokemon/pokemon.ts'

export interface ProfileRow {
  id: string
  username?: string | null
  email?: string | null
  faction?: string | null
  player_class?: string | null
  trainer_level?: number | null
  avatar_style?: string | null
  nick_style?: string | null
  pvp_wins?: number | null
  pvp_losses?: number | null
  elo_rating?: number | null
  created_at?: string | null
  gender?: string | null
  playtime?: number | null
  last_played_at?: string | null
  ranked_max_elo?: number | null
  class_level?: number | null
  class_xp?: number | null
  box_count?: number | null
  pvp_draws?: number | null
  longest_streak?: number | null
  shiny_count?: number | null
  max_damage?: number | null
  total_battles?: number | null
  trade_volume?: number | null
  capture_attempts?: number | null
  capture_successes?: number | null
}

export interface SaveStateData {
  trainer?: string
  playtime?: number
  classLevel?: number
  classXP?: number
  rankedMaxElo?: number
  box?: unknown[]
  team?: unknown[]
  faction?: string | null
  playerClass?: string | null
  trainerLevel?: number
  trainerExp?: number
  trainerExpNeeded?: number
  avatar_style?: string
  nick_style?: string
  badges?: number
  gender?: string
  defeatedGyms?: string[]
  pokedex?: unknown[]
  seenPokedex?: string[]
  stats?: {
    trainersDefeated?: number
    wins?: number
    losses?: number
    maxDamage?: number
    totalBattles?: number
    tradeVolume?: number
    captureAttempts?: number
    captureSuccesses?: number
    eventParticipations?: number
    eventMedalsFirst?: number
    eventMedalsSecond?: number
    eventMedalsThird?: number
    eventMedalsTotal?: number
  }
  pvpStats?: {
    wins?: number
    losses?: number
    draws?: number
  }
  eloRating?: number
  warCoins?: number
  money?: number
  battleCoins?: number
  classData?: {
    criminality?: number
    reputation?: number
    longestStreak?: number
  }
  warMyPtsLocal?: Record<string, number>
  rankedMedals?: RankedSeasonMedal[]
}

const FACTION_LABELS: Record<string, string> = {
  union: 'Equipo Unión',
  poder: 'Equipo Poder'
};

const FACTION_COLORS: Record<string, string> = {
  union: 'rgba(59, 130, 246, 1)',
  poder: 'rgba(239, 68, 68, 1)'
};

export function resolveFactionLabel(f: string | null | undefined): string {
  if (!f) return 'Sin Bando';
  const clean = f.trim().toLowerCase();
  if (!clean || clean === 'null' || clean === 'undefined') return 'Sin Bando';
  return FACTION_LABELS[clean] || clean.toUpperCase();
}

export function resolveFactionColor(f: string | null | undefined): string {
  if (!f) return 'rgba(148, 163, 184, 0.5)';
  const clean = f.trim().toLowerCase();
  if (!clean || clean === 'null' || clean === 'undefined') return 'rgba(148, 163, 184, 0.5)';
  return FACTION_COLORS[clean] || 'rgba(148, 163, 184, 1)';
}

export function resolveCosmeticField<T>(
  isOwn: boolean,
  ownValue: T | undefined | null,
  cachedValue: T | undefined | null,
  friendValue: T | undefined | null,
  profileValue: T | undefined | null,
  saveValue: T | undefined | null,
  defaultValue: T
): T {
  if (isOwn) {
    return ownValue ?? profileValue ?? defaultValue;
  }
  if (cachedValue !== undefined && cachedValue !== null && cachedValue !== '') {
    return cachedValue;
  }
  if (friendValue !== undefined && friendValue !== null && friendValue !== '') {
    return friendValue;
  }
  return profileValue ?? saveValue ?? defaultValue;
}

export function resolveStatField<T>(
  isOwn: boolean,
  ownValue: T | undefined | null,
  profileValue: T | undefined | null,
  saveValue: T | undefined | null,
  defaultValue: T
): T {
  if (isOwn) {
    return profileValue ?? ownValue ?? defaultValue;
  }
  return profileValue ?? saveValue ?? defaultValue;
}

export function computeShiniesCount(
  isOwn: boolean,
  team: unknown[] | undefined,
  box: unknown[] | undefined,
  profileShinyCount: number | null | undefined
): number {
  if (!isOwn && profileShinyCount !== undefined && profileShinyCount !== null) {
    return profileShinyCount;
  }
  const teamShinies = (team || []).filter(p => Boolean(typeof p === 'object' && p !== null && 'isShiny' in p && (p as { isShiny?: boolean }).isShiny)).length;
  const boxShinies = (box || []).filter(p => Boolean(typeof p === 'object' && p !== null && 'isShiny' in p && (p as { isShiny?: boolean }).isShiny)).length;
  return teamShinies + boxShinies;
}

export interface EventMedalCounts {
  first: number;
  second: number;
  third: number;
  total: number;
}

const TROPHY_RANKS_SET: ReadonlySet<PokemonCompetitionRank> = new Set<PokemonCompetitionRank>(POKEMON_COMPETITION_RANKS); // runtime-set: Fast O(1) membership lookup set

function parseTrophyRank(t: unknown): PokemonCompetitionRank | null {
  if (t && typeof t === 'object' && 'rank' in t) {
    const r = (t as { rank?: string }).rank;
    if (r && TROPHY_RANKS_SET.has(r as PokemonCompetitionRank)) {
      return r as PokemonCompetitionRank;
    }
  }
  return null;
}

function parsePokemonTrophies(entry: unknown, counts: Record<PokemonCompetitionRank, number>): void { // boundary-ok: External runtime boundary deserializer
  if (!entry || typeof entry !== 'object' || !('trophies' in entry)) return;
  const trophies = (entry as { trophies?: unknown[] }).trophies;
  if (!Array.isArray(trophies)) return;

  for (const t of trophies) {
    const rank = parseTrophyRank(t);
    if (rank) {
      counts[rank]++;
    }
  }
}

function countPokemonListTrophies(list: unknown[] | undefined, counts: { first: number; second: number; third: number }): void {
  if (!Array.isArray(list)) return;
  for (const p of list) {
    parsePokemonTrophies(p, counts);
  }
}

export function computeEventTrophyCounts(
  team: unknown[] | undefined,
  box: unknown[] | undefined,
  dbFirst = 0,
  dbSecond = 0,
  dbThird = 0,
  savedFirst = 0,
  savedSecond = 0,
  savedThird = 0
): EventMedalCounts {
  const counts = { first: 0, second: 0, third: 0 };
  countPokemonListTrophies(team, counts);
  countPokemonListTrophies(box, counts);

  const finalFirst = Math.max(counts.first, dbFirst, savedFirst);
  const finalSecond = Math.max(counts.second, dbSecond, savedSecond);
  const finalThird = Math.max(counts.third, dbThird, savedThird);

  return {
    first: finalFirst,
    second: finalSecond,
    third: finalThird,
    total: finalFirst + finalSecond + finalThird
  };
}

const DEFAULT_RANKED_ELO = 1000 as const;

interface AwardPrizePayload {
  type?: string;
  season?: string;
  tier?: unknown;
  tournamentName?: string;
  tournament_name?: string;
  themeId?: unknown;
  theme_id?: unknown;
  rank?: unknown;
  elo?: unknown;
}

interface TrainerAwardRow {
  id?: string;
  event_id?: string;
  awarded_at?: string;
  prize?: unknown;
}

function parsePrizeObject(rawPrize: unknown): AwardPrizePayload | null {
  if (!rawPrize || (typeof rawPrize !== 'object' && typeof rawPrize !== 'string')) return null;
  if (typeof rawPrize === 'string') {
    try {
      const parsed = JSON.parse(rawPrize);
      return (parsed && typeof parsed === 'object') ? (parsed as AwardPrizePayload) : null;
    } catch {
      return null;
    }
  }
  return rawPrize as AwardPrizePayload;
}

function parseRankedMedalFromAward(
  row: TrainerAwardRow,
  seenSeasons: Set<string>
): RankedSeasonMedal | null {
  const pObj = parsePrizeObject(row.prize);
  if (!pObj || pObj.type !== 'ranked_medal') return null;

  const season = String(pObj.season || row.event_id || 'TEMPORADA ACTUAL');
  if (seenSeasons.has(season)) return null;

  seenSeasons.add(season);
  const tierVal = pObj.tier;
  const tournamentName = typeof pObj.tournamentName === 'string'
    ? pObj.tournamentName
    : (typeof pObj.tournament_name === 'string' ? pObj.tournament_name : undefined);
  const rawTheme = pObj.themeId ?? pObj.theme_id;
  const themeId = isSeasonalThemeId(rawTheme) ? rawTheme : undefined;

  return {
    id: row.id || `medal_${row.event_id || 'ranked'}`,
    seasonName: season,
    tournamentName,
    themeId,
    tier: isRankedTierId(tierVal) ? tierVal : 'bronce',
    rank: pObj.rank ? Number(pObj.rank) : undefined,
    finalElo: Number(pObj.elo) || DEFAULT_RANKED_ELO,
    awardedAt: String(row.awarded_at || '')
  };
}

export function extractRankedMedals(
  awardsData: unknown,
  savedMedals: unknown
): RankedSeasonMedal[] {
  const medals: RankedSeasonMedal[] = [];
  const seenSeasons = new Set<string>();

  if (Array.isArray(awardsData)) {
    for (const a of awardsData) {
      if (!a || typeof a !== 'object') continue;
      const medal = parseRankedMedalFromAward(a as { prize?: unknown; event_id?: string; awarded_at?: string; id?: string }, seenSeasons);
      if (medal) medals.push(medal);
    }
  }

  if (Array.isArray(savedMedals)) {
    for (const m of savedMedals as RankedSeasonMedal[]) {
      if (m && m.seasonName && !seenSeasons.has(m.seasonName)) {
        seenSeasons.add(m.seasonName);
        medals.push(m);
      }
    }
  }

  return medals;
}

export function parseAwardMedalCounts(awardsData: unknown): { first: number; second: number; third: number } {
  let first = 0;
  let second = 0;
  let third = 0;
  if (!Array.isArray(awardsData)) return { first, second, third };

  for (const a of awardsData as { prize?: unknown }[]) {
    const p = parsePrizeObject(a?.prize);
    if (p && 'rank' in p) {
      const r = p.rank;
      if (r === 'first') first++;
      else if (r === 'second') second++;
      else if (r === 'third') third++;
    }
  }
  return { first, second, third };
}

export function calculateDistinctEventCount(compEntryData: unknown): number {
  if (!Array.isArray(compEntryData)) return 0;
  const distinctEvents = new Set((compEntryData as { event_id?: string }[]).map(e => e.event_id).filter(Boolean));
  return distinctEvents.size;
}

export function mapReplayRows(replaysData: unknown): BattleReplayRecord[] {
  if (!Array.isArray(replaysData)) return [];
  return replaysData.map(raw => {
    const r = raw as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    return {
      id: String(r.id),
      battleCode: String(r.battle_code || r.battleCode) as BattleCode,
      seasonId: String(r.season_id || r.seasonId || ''),
      themeId: isSeasonalThemeId(r.theme_id) ? r.theme_id : (isSeasonalThemeId(r.themeId) ? r.themeId : 'masters_allstars'),
      p1: typeof r.p1_data === 'string' ? JSON.parse(r.p1_data) : (r.p1 || {}),
      p2: typeof r.p2_data === 'string' ? JSON.parse(r.p2_data) : (r.p2 || {}),
      turnsCount: Number(r.turns_count ?? r.turnsCount ?? 0),
      winnerSide: String(r.winner_side || r.winnerSide || 'p1') as SideID,
      choiceStream: typeof r.choice_stream === 'string' ? JSON.parse(r.choice_stream) : (r.choiceStream || []),
      initialSeed: typeof r.initial_seed === 'string' ? JSON.parse(r.initial_seed) : (r.initialSeed || [0, 0, 0, 0]),
      isTop10Archived: Boolean(r.is_top10_archived ?? r.isTop10Archived),
      viewsCount: Number(r.views_count ?? r.viewsCount ?? 0),
      createdAt: String(r.created_at || r.createdAt || '')
    };
  });
}

export function parseRawSaveData(saveData: unknown): SaveStateData | null {
  if (!saveData) return null;
  if (typeof saveData === 'string') {
    try {
      return JSON.parse(saveData) as SaveStateData;
    } catch {
      return null;
    }
  }
  return typeof saveData === 'object' ? (saveData as SaveStateData) : null;
}

