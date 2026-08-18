/**
 * src/logic/battle/helpers/showdownSeats.ts
 *
 * Canonical definition and helper utilities for battle seat identifiers.
 */

import type { SideID } from '@pkmn/sim';

export const REPLAY_SEATS: readonly SideID[] = ['p1', 'p2', 'p3', 'p4']; // domain-ok

export function isReplaySeat(seat: string): seat is SideID {
  return REPLAY_SEATS.includes(seat as SideID);
}
