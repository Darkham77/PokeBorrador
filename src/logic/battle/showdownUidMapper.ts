/**
 * showdownUidMapper.ts
 *
 * Estandariza la asociación de identificadores únicos (UIDs) de los Pokémon
 * con los nombres/apodos utilizados en el simulador oficial Pokémon Showdown.
 */

/**
 * Retorna el nickname único acotado que Pokémon Showdown utilizará para mapear el UID.
 * Utiliza los primeros 8 caracteres del UID para evitar truncamiento destructivo.
 */
export function getShowdownNickname(uid: string): string {
  if (!uid) return '';
  return uid.split('-')[0] || '';
}

/**
 * Compara dos UIDs (completos o prefijos de 8 caracteres de Showdown) para determinar si coinciden.
 */
export function isMatchingUid(uidA: string | undefined | null, uidB: string | undefined | null): boolean {
  if (!uidA || !uidB) return false;
  const a = uidA.toLowerCase(); // text-ok
  const b = uidB.toLowerCase(); // text-ok
  return a === b || a.startsWith(b) || b.startsWith(a);
}

/**
 * Busca un Pokémon en una lista usando la utilidad centralizada de coincidencia de UIDs.
 */
export function findMatchingPokemon<T extends { uid?: string }>(
  targetUid: string,
  pokemonList: Array<T | null | undefined>
): T | undefined {
  if (!targetUid || !Array.isArray(pokemonList)) return undefined;
  return pokemonList.find(p => p && p.uid && isMatchingUid(p.uid, targetUid)) as T | undefined;
}

/**
 * Alias de compatibilidad para buscar un Pokémon por su apodo / prefijo de Showdown en una lista.
 */
export function findPokemonByShowdownName<T extends { uid?: string }>(
  expectedName: string,
  pokemonList: Array<T | null | undefined>
): T | undefined {
  return findMatchingPokemon(expectedName, pokemonList);
}

/**
 * Busca un valor en un mapa Record<string, T> donde las llaves pueden ser UIDs completos o de Showdown.
 */
export function findMatchingValue<T>(
  targetUid: string,
  map: Record<string, T>
): T | undefined {
  if (!targetUid || !map) return undefined;
  if (map[targetUid] !== undefined) return map[targetUid];
  const matchedKey = Object.keys(map).find(k => isMatchingUid(k, targetUid));
  return matchedKey !== undefined ? map[matchedKey] : undefined;
}
