import { STARTER_POKEMON_IDS, type StarterPokemonId } from '../system/constants.ts'


export interface StarterPokemonConfig {
  id: StarterPokemonId
}

export function isStarterPokemonId(raw: string): raw is StarterPokemonId {
  return (STARTER_POKEMON_IDS as readonly string[]).includes(raw); // domain-ok
}

export function requireStarterPokemonId(raw: string): StarterPokemonId {
  if (isStarterPokemonId(raw)) return raw;
  throw new Error(`[starters] Invalid StarterPokemonId: '${raw}'`);
}

export const STARTER_POKEMON: readonly StarterPokemonConfig[] = STARTER_POKEMON_IDS.map((id) => ({
  id: requireStarterPokemonId(id)
}));
