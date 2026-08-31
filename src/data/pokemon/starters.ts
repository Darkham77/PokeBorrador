import { STARTER_POKEMON_IDS, STARTER_POKEMON_IDS_SET, type StarterPokemonId } from '../system/constants.ts'


export interface StarterPokemonConfig {
  id: StarterPokemonId
}

function isStarterPokemonId(raw: string): raw is StarterPokemonId {
  return STARTER_POKEMON_IDS_SET.has(raw);
}

function requireStarterPokemonId(raw: string): StarterPokemonId {
  if (isStarterPokemonId(raw)) return raw;
  throw new Error(`[starters] Invalid StarterPokemonId: '${raw}'`);
}

export const STARTER_POKEMON: readonly StarterPokemonConfig[] = STARTER_POKEMON_IDS.map((id) => ({
  id: requireStarterPokemonId(id)
}));
