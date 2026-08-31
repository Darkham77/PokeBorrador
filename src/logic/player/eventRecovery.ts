import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import type { CompetitionEntry } from '../../types/system/stores.ts';
import type { Event as GameEvent } from '../events/eventEngine.ts';
import { isEventActiveNow } from '../events/eventEngine.ts';

/**
 * Pure logic to heal Pokémon that are stuck in the "onEvent" state when they shouldn't be.
 * A Pokémon is stuck if it has onEvent = true, but is not enrolled in any currently active event.
 * Returns true if any Pokémon was rehabilitated.
 */
export function healStuckEventPokemon(
  team: (Pokemon | null)[],
  box: (Pokemon | null)[],
  activeEvents: GameEvent[] | undefined,
  userEntries: Record<string, CompetitionEntry> | undefined,
  currentInstant?: Temporal.Instant
): boolean {
  const activeEventIds = new Set<string>();
  if (Array.isArray(activeEvents)) {
    const checkTime = currentInstant || Temporal.Now.instant();
    for (const ev of activeEvents) {
      if (isEventActiveNow(ev, checkTime)) {
        activeEventIds.add(ev.id);
      }
    }
  }

  const validEnrolledUids = new Set<string>();
  if (userEntries) {
    for (const entry of Object.values(userEntries)) {
      if (entry && entry.pokemon_uid && entry.event_id && activeEventIds.has(entry.event_id)) {
        validEnrolledUids.add(entry.pokemon_uid);
      }
    }
  }

  let fixedAny = false;
  const safeTeam = Array.isArray(team) ? team : [];
  const safeBox = Array.isArray(box) ? box : [];
  const allPokes = [...safeTeam, ...safeBox];
  allPokes.forEach((p) => {
    if (p && p.onEvent) {
      if (!validEnrolledUids.has(p.uid)) {
        p.onEvent = false;
        fixedAny = true;
      }
    }
  });

  return fixedAny;
}
