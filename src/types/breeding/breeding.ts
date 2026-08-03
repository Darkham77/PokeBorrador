import type { Pokemon, PokemonIVs, PokemonMoveId } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { NatureId } from '@/data/battle/natures'
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'

export interface DaycareSlot {
  pokemon: Pokemon | null;
  slotIndex: number;
  depositedAt?: string | null; // domain-ok
  deposited_at?: string | null; // domain-ok
}

export interface DaycareEgg {
  id: string; // domain-ok: unique egg instance id
  species: PokemonSpeciesId;
  name: string; // domain-ok
  level: number;
  isEgg: boolean;
  steps: number;
  motherId?: string; // domain-ok
  mother_id?: string; // domain-ok
  depositedAt?: string; // domain-ok
  deposited_at?: string; // domain-ok
  ivs: PokemonIVs;
  nature: NatureId;
  movesAtBirth: PokemonMoveId[];
  abilityIndex: number;
  isShiny: boolean;
  cost: number;
  tint?: string; // domain-ok
  isAncestral?: boolean;
  inheritedIvs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number }; // open-record
  inherited_ivs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number }; // open-record
}

export interface DaycareMission {
  date: string; // domain-ok
  targetId: PokemonSpeciesId;
  requirement: {
    type: string; // domain-ok
    minLevel?: number;
    minIvTotal?: number;
    nature?: NatureId;
    stat31?: keyof PokemonIVs;
  };
  reqText: string; // domain-ok
  reward: {
    id: string; // domain-ok
    name: string; // domain-ok
    qty: number;
    icon: string; // domain-ok
  };
  completed: boolean;
  trainerType: string; // domain-ok
  trainerName: string; // domain-ok
  trainerSprite: NpcSpriteId;
  dialogue: string; // domain-ok
}
