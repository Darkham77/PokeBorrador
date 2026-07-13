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
 * Busca y asocia un Pokémon de la lista del cliente con el nombre/apodo esperado de Showdown,
 * validando si el UID del Pokémon del cliente comienza con el nombre (prefijo de UID) de Showdown.
 */
export function findPokemonByShowdownName<T extends { uid?: string }>(
  expectedName: string,
  pokemonList: T[]
): T | undefined {
  if (!expectedName || !Array.isArray(pokemonList)) return undefined;
  const cleanName = expectedName.toLowerCase();
  return pokemonList.find(p => p && p.uid && p.uid.toLowerCase().startsWith(cleanName));
}
