/**
 * src/logic/player/identityCooldown.ts
 * 
 * Shared logic and constants for trainer identity changes (Name and Gender).
 * Enforces the official 30-day cooldown across Profile, Class Management, and DB RPCs.
 */

export const RENAME_COOLDOWN_DAYS = 30

export function getDaysUntilIdentityChange(lastRenamedAt?: string | null): number {
  if (!lastRenamedAt) return 0
  try {
    const lastRename = Temporal.Instant.from(lastRenamedAt)
    const now = Temporal.Now.instant()
    const diff = now.since(lastRename, { largestUnit: 'hours' })
    const daysPassed = Math.floor(diff.hours / 24)
    return Math.max(0, RENAME_COOLDOWN_DAYS - daysPassed)
  } catch (_e) {
    return 0
  }
}

export function canChangeIdentity(lastRenamedAt?: string | null): boolean {
  return getDaysUntilIdentityChange(lastRenamedAt) === 0
}
