/**
 * showdownUidMapper.ts
 *
 * Standardizes the association of Pokémon unique identifiers (UIDs)
 * with the names/nicknames used in the official Pokémon Showdown simulator.
 */

/**
 * Returns the short unique nickname that Pokémon Showdown will use to map the UID.
 * Uses the first 8 characters of the UID to prevent destructive truncation.
 */
export function getShowdownNickname(uid: string): string {
  if (!uid) return '';
  return uid.split('-')[0] || '';
}

/**
 * Compares two UIDs (full or 8-character Showdown prefixes) to determine if they match.
 */
export function isMatchingUid(uidA: string | undefined | null, uidB: string | undefined | null): boolean {
  if (!uidA || !uidB) return false;
  const a = uidA.toLowerCase(); // text-ok: UI text display localization string
  const b = uidB.toLowerCase(); // text-ok: UI text display localization string
  if (a === b) return true;
  if (a.startsWith(b) && (a[b.length] === '-' || a[b.length] === '_')) return true;
  if (b.startsWith(a) && (b[a.length] === '-' || b[a.length] === '_')) return true;
  return false;
}

/**
 * Finds a Pokémon in a list using the centralized UID matching utility.
 */
export function findMatchingPokemon<T extends { uid?: string }>(
  targetUid: string,
  pokemonList: Array<T | null | undefined>
): T | undefined {
  if (!targetUid || !Array.isArray(pokemonList)) return undefined;
  return pokemonList.find(p => p && p.uid && isMatchingUid(p.uid, targetUid)) as T | undefined;
}

/**
 * Compatibility alias to find a Pokémon by its Showdown nickname / prefix in a list.
 */
export function findPokemonByShowdownName<T extends { uid?: string }>(
  expectedName: string,
  pokemonList: Array<T | null | undefined>
): T | undefined {
  return findMatchingPokemon(expectedName, pokemonList);
}

/**
 * Finds a value in a Record<string, T> map where keys may be full or Showdown UIDs.
 */
export function findMatchingValue<T>(
  targetUid: string,
  map: Record<string, T>
): T | undefined {
  if (!targetUid || !map) return undefined;
  if (map[targetUid] !== undefined) return map[targetUid];
  for (const k in map) {
    if (isMatchingUid(k, targetUid)) return map[k];
  }
  return undefined;
}
