/**
 * Canonical domain contracts for game time phases and day cycles.
 * Single Source of Truth (SSoT) for time of day across the entire engine.
 */
export const DAY_PHASES = ['morning', 'day', 'dusk', 'night'] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

