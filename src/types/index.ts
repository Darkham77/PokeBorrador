export type PokemonId = string;

export interface PokemonBaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface PokemonSpecies {
  id: PokemonId;
  name: string;
  type: string[];
  baseStats: PokemonBaseStats;
  catchRate: number;
  baseExperience: number;
}

export type ItemId = string;

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  price: number;
  type: string;
}
