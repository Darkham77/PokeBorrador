import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon'

export interface DaycareSlot {
  pokemon: Pokemon | null;
  slotIndex: number;
  depositedAt?: string | null;
  deposited_at?: string | null;
}

export interface DaycareEgg {
  id: string;
  species: string;
  name: string;
  level: number;
  isEgg: boolean;
  steps: number;
  motherId?: string;
  mother_id?: string;
  depositedAt?: string;
  deposited_at?: string;
  ivs: PokemonIVs;
  nature: string;
  movesAtBirth: string[];
  abilityIndex: number;
  isShiny: boolean;
  cost: number;
  tint?: string;
  isAncestral?: boolean;
  inheritedIvs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number };
  inherited_ivs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number };
}

export interface DaycareMission {
  date: string;
  targetId: string;
  requirement: {
    type: string;
    minLevel?: number;
    minIvTotal?: number;
    nature?: string;
    stat31?: keyof PokemonIVs;
  };
  reqText: string;
  reward: {
    id: string;
    name: string;
    qty: number;
    icon: string;
  };
  completed: boolean;
  trainerType: string;
  trainerName: string;
  trainerSprite: string;
  dialogue: string;
}
