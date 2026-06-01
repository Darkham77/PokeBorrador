import type { DaycareEgg } from '@/types/breeding';
import type { PokemonEgg, PokemonIVs } from '@/types/pokemon';

interface DaycareEggParams {
  id?: string;
  species: string;
  motherId?: string;
  ivs: PokemonIVs;
  nature: string;
  movesAtBirth: string[];
  abilityIndex: number;
  isShiny: boolean;
  cost: number;
  tint?: string;
  steps?: number;
  isAncestral?: boolean;
}

interface PokemonEggParams {
  uid?: string;
  species: string; // matches pokemonId or id
  steps?: number;
  ivs?: Partial<PokemonIVs>;
  nature?: string;
  movesAtBirth?: string[];
  abilitySlot?: number;
  isShiny?: boolean;
  tint?: string;
  isAncestral?: boolean;
}

/**
 * Factory for creating egg objects within the breeding and inventory systems.
 */
export const eggFactory = {
  /**
   * Creates a new DaycareEgg object for the daycare warehouse.
   */
  createDaycareEgg(params: DaycareEggParams): DaycareEgg {
    const now = Temporal.Now.instant().epochMilliseconds;
    const eggId = params.id || `egg_${now}_${Math.random().toString(36).substring(2, 7)}`;
    
    return {
      id: eggId,
      species: params.species,
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: params.steps ?? 2500,
      mother_id: params.motherId || '',
      deposited_at: Temporal.Now.instant().toString(),
      ivs: params.ivs,
      nature: params.nature,
      movesAtBirth: params.movesAtBirth,
      abilityIndex: params.abilityIndex,
      isShiny: params.isShiny,
      cost: params.cost,
      tint: params.tint || undefined,
      isAncestral: params.isAncestral || undefined,
      inherited_ivs: {
        _cost: params.cost,
        _scanned: false,
      },
    };
  },

  /**
   * Creates a PokemonEgg object ready to be incubated in the player's inventory.
   */
  createPokemonEgg(params: PokemonEggParams): PokemonEgg {
    const timestamp = Temporal.Now.instant().epochMilliseconds;
    const eggUid = params.uid || `${params.species}-${timestamp}`;

    return {
      uid: eggUid,
      id: params.species,
      steps: params.steps ?? 2500,
      ready: (params.steps ?? 2500) <= 0,
      ivs: params.ivs,
      nature: params.nature,
      movesAtBirth: params.movesAtBirth,
      abilitySlot: params.abilitySlot,
      isShiny: params.isShiny,
      tint: params.tint || undefined,
      isAncestral: params.isAncestral || undefined,
    };
  },
};
