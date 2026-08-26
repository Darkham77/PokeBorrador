import type { Pokemon } from '../../types/pokemon/pokemon.ts';

export interface RecoveryActiveMission {
  targetPokemonUid?: string;
  targetPokemonIdx?: number;
  pokeUid?: string;
  [key: string]: unknown;
}

/**
 * Pure logic to heal pokemon that are stuck in the "onMission" state when they shouldn't be.
 * A pokemon is stuck if it has onMission = true, but is not referenced by the currently active mission.
 * Returns true if any pokemon was fixed.
 */
export function healStuckMissions(
  team: (Pokemon | null)[],
  box: (Pokemon | null)[],
  activeMission: RecoveryActiveMission | null | undefined
): boolean {
  let referencedUid: string | null = null;
  if (activeMission) {
    if (activeMission.targetPokemonUid) {
      referencedUid = activeMission.targetPokemonUid;
    } else if (activeMission.pokeUid) {
      referencedUid = activeMission.pokeUid;
    } else if (activeMission.targetPokemonIdx !== undefined && activeMission.targetPokemonIdx !== null) {
      const p = box[activeMission.targetPokemonIdx];
      if (p) referencedUid = p.uid;
    }
  }

  let fixedAny = false;
  const allPokes = [...team, ...box];
  allPokes.forEach((p) => {
    if (p && p.onMission) {
      if (referencedUid === null || p.uid !== referencedUid) {
        p.onMission = false;
        fixedAny = true;
      }
    }
  });

  return fixedAny;
}
