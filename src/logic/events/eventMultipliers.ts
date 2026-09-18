/**
 * src/logic/events/eventMultipliers.ts
 *
 * Single source of truth for global event multipliers accessible by low-level game actions
 * without creating circular dependencies between stores.
 */

let activeExpMultiplier = 1 // singleton-ok: Singleton instance state container

export function setEventExpMultiplier(mult: number): void {
  activeExpMultiplier = mult
}

export function getEventExpMultiplier(): number {
  return activeExpMultiplier
}
