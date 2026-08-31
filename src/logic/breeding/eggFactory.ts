const EGG_HATCH_STEPS_BASE = 250
const EGG_HATCH_STEPS_VARIANCE = 51
import type { DaycareEgg } from '@/types/breeding/breeding';
import type { PokemonEgg, PokemonIVs } from '@/types/pokemon/pokemon';
import { toNatureId } from '@/data/battle/natures';
import { requirePokemonMoveId } from '@/data/battle/moves';
import { getEggSpecies } from './breedingEngine.ts';

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
  color?: string;
  isNpc?: boolean;
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
    const speciesId = getEggSpecies(params.species);
    
    return {
      id: eggId,
      species: speciesId,
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: params.steps ?? (Math.floor(Math.random() * EGG_HATCH_STEPS_VARIANCE) + EGG_HATCH_STEPS_BASE),
      mother_id: params.motherId || '',
      deposited_at: Temporal.Now.instant().toString(),
      ivs: params.ivs,
      nature: toNatureId(params.nature),
      movesAtBirth: params.movesAtBirth.map(requirePokemonMoveId),
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
    const speciesId = getEggSpecies(params.species);
    const timestamp = Temporal.Now.instant().epochMilliseconds;
    const eggUid = params.uid || `${speciesId}-${timestamp}`;
    const steps = params.steps ?? (Math.floor(Math.random() * EGG_HATCH_STEPS_VARIANCE) + EGG_HATCH_STEPS_BASE);

    return {
      uid: eggUid,
      id: speciesId,
      steps: steps,
      totalSteps: steps,
      ready: steps <= 0,
      ivs: params.ivs,
      nature: params.nature ? toNatureId(params.nature) : undefined,
      movesAtBirth: params.movesAtBirth ? params.movesAtBirth.map(requirePokemonMoveId) : undefined,
      abilitySlot: params.abilitySlot,
      isShiny: params.isShiny,
      tint: params.tint || undefined,
      isAncestral: params.isAncestral || undefined,
      color: params.color || undefined,
      isNpc: params.isNpc || undefined,
    };
  },
};
