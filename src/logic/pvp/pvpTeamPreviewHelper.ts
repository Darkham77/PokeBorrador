import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PvpMatchFormat } from '@/types/battle/pvp';

/**
 * Validates and orders a team based on Team Preview user selections.
 * Guarantees legal slot counts (3 for 3v3, 6 for 6v6) and lead designation.
 */
export function validateAndResolveTeamPreviewPick(
  fullTeam: Pokemon[],
  selectedUids: string[],
  format: PvpMatchFormat = '3v3'
): Pokemon[] {
  const pokemonByUid = new Map<string, Pokemon>();
  for (const p of fullTeam) {
    if (p && p.uid) pokemonByUid.set(p.uid, p);
  }

  const targetCount = format === '6v6' ? 6 : 3;
  const picked: Pokemon[] = [];
  const pickedUids = new Set<string>();

  // 1. Add explicitly selected Pokémon in the exact user-specified order
  for (const uid of selectedUids) {
    if (picked.length >= targetCount) break;
    const mon = pokemonByUid.get(uid);
    if (mon && !pickedUids.has(uid)) {
      picked.push(mon);
      pickedUids.add(uid);
    }
  }

  // 2. Auto-fill any remaining slots from the full team
  if (picked.length < targetCount) {
    for (const mon of fullTeam) {
      if (picked.length >= targetCount) break;
      if (mon && mon.uid && !pickedUids.has(mon.uid)) {
        picked.push(mon);
        pickedUids.add(mon.uid);
      }
    }
  }

  return picked;
}
