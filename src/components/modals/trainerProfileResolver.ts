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
