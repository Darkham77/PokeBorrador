/**
 * src/logic/battle/helpers/showdownSeats.ts
 *
 * Canonical definition and helper utilities for battle seat identifiers.
 */

import type { SideID } from '@pkmn/sim';

export const SHOWDOWN_SEAT_KEYS = ['p1', 'p2', 'p3', 'p4'] as const;
export type ShowdownSeatKey = (typeof SHOWDOWN_SEAT_KEYS)[number];

const SHOWDOWN_SEAT_KEYS_SET: ReadonlySet<string> = new Set(SHOWDOWN_SEAT_KEYS);

export function isReplaySeat(seat: string): seat is SideID {
  return SHOWDOWN_SEAT_KEYS_SET.has(seat);
}
