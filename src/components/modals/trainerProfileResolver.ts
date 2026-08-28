/**
 * src/components/modals/trainerProfileResolver.ts
 *
 * Pure helper functions for resolving trainer profile values across local store,
 * cached cosmetics, friends list, and fetched profile/save data.
 */

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

