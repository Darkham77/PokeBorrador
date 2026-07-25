import { isPokemonStatus, type PokemonStatus } from '../../types/pokemon/pokemon.ts';

/**
 * Adaptador de frontera estricto para convertir estados entre Pokémon Showdown y Poké Vicio.
 */
export function normalizeShowdownStatus(status: string | null | undefined): PokemonStatus {
  if (!status || status === 'fnt') return '';
  const clean = status.trim().toLowerCase();
  if (isPokemonStatus(clean)) return clean;
  return '';
}

export function toShowdownStatus(status: PokemonStatus): string {
  return status ?? '';
}
