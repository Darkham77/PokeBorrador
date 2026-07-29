
import type { GymId } from '@/data/world/gyms';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonType } from '@/data/battle/types';
import type { ItemId } from '@/data/inventory/items';

export interface GymTeamMember {
  pokemonId: PokemonSpeciesId;
  level: number;
}

export interface GymDifficulty {
  pokemon: PokemonSpeciesId[];
  levels: number[];
  team?: GymTeamMember[];
}

export interface Gym {
  id: GymId;
  name: string; // domain-ok
  city: string; // domain-ok
  leader: string; // domain-ok
  type: PokemonType;
  typeColor: string; // domain-ok
  badge: string; // domain-ok
  badgeName: string; // domain-ok
  quote: string; // domain-ok
  victoryQuote: string; // domain-ok
  rewardTM: ItemId;
  pokemon: PokemonSpeciesId[];
  levels: number[];
  badgesRequired: number;
  difficulties: {
    easy: GymDifficulty;
    normal: GymDifficulty;
    hard: GymDifficulty;
  };
}
