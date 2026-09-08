/**
 * src/components/modals/trainerProfileResolver.ts
 *
 * Pure helper functions for resolving trainer profile values across local store,
 * cached cosmetics, friends list, and fetched profile/save data.
 */

import type { RankedSeasonMedal } from '@/types/battle/pvp.ts'
import { isRankedTierId, isSeasonalThemeId } from '@/data/system/rankedData.ts'

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
  let first = 0;
  let second = 0;
  let third = 0;

  const countPokes = (list: unknown[] | undefined) => {
    if (!list || !Array.isArray(list)) return;
    for (const p of list) {
      if (p && typeof p === 'object' && 'trophies' in p && Array.isArray((p as { trophies?: unknown[] }).trophies)) {
        for (const t of (p as { trophies: unknown[] }).trophies) {
          if (t && typeof t === 'object' && 'rank' in t) {
            const r = (t as { rank?: string }).rank;
            if (r === 'first') first++;
            else if (r === 'second') second++;
            else if (r === 'third') third++;
          }
        }
      }
    }
  };

  countPokes(team);
  countPokes(box);

  const finalFirst = Math.max(first, dbFirst, savedFirst);
  const finalSecond = Math.max(second, dbSecond, savedSecond);
  const finalThird = Math.max(third, dbThird, savedThird);

  return {
    first: finalFirst,
    second: finalSecond,
    third: finalThird,
    total: finalFirst + finalSecond + finalThird
  };
}

export function extractRankedMedals(
  awardsData: unknown[] | undefined | null,
  savedMedals: RankedSeasonMedal[] | undefined | null
): RankedSeasonMedal[] {
  const medals: RankedSeasonMedal[] = [];
  const seenSeasons = new Set<string>();

  if (Array.isArray(awardsData)) {
    for (const a of awardsData) {
      if (!a || typeof a !== 'object') continue;
      const row = a as { prize?: unknown; event_id?: string; awarded_at?: string; id?: string };
      let p = row.prize;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch { p = null; }
      }
      if (p && typeof p === 'object') {
        const pObj = p as Record<string, unknown>; // open-record: Generic key-value data dictionary container
        if (pObj.type === 'ranked_medal') {
          const season = String(pObj.season || row.event_id || 'TEMPORADA ACTUAL');
          if (!seenSeasons.has(season)) {
            seenSeasons.add(season);
            const tierVal = pObj.tier;
            const tournamentName = typeof pObj.tournamentName === 'string'
              ? pObj.tournamentName
              : (typeof pObj.tournament_name === 'string' ? pObj.tournament_name : undefined);
            const rawTheme = pObj.themeId ?? pObj.theme_id;
            const themeId = isSeasonalThemeId(rawTheme) ? rawTheme : undefined;
            medals.push({
              id: row.id || `medal_${row.event_id || 'ranked'}`,
              seasonName: season,
              tournamentName,
              themeId,
              tier: isRankedTierId(tierVal) ? tierVal : 'bronce',
              rank: pObj.rank ? Number(pObj.rank) : undefined,
              finalElo: Number(pObj.elo) || 1000,
              awardedAt: String(row.awarded_at || '')
            });
          }
        }
      }
    }
  }

  if (Array.isArray(savedMedals)) {
    for (const m of savedMedals) {
      if (m && m.seasonName && !seenSeasons.has(m.seasonName)) {
        seenSeasons.add(m.seasonName);
        medals.push(m);
      }
    }
  }

  return medals;
}

