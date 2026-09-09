import type { Pokemon, PokemonIVs, PokemonMoveId } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { NatureId } from '@/data/battle/natures'
import type { ItemId } from '@/data/inventory/items'
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'

import type { TrainerTypeKey } from '@/data/player/trainerTypes'

export const BREEDING_ACTIVITY_SOURCES = ['battle', 'capture', 'gym', 'minigame'] as const;
export type BreedingActivitySource = (typeof BREEDING_ACTIVITY_SOURCES)[number];

export const DAYCARE_MISSION_REQUIREMENT_TYPES = ['level', 'nature', 'iv_total', 'iv_31'] as const;
export type DaycareMissionRequirementType = (typeof DAYCARE_MISSION_REQUIREMENT_TYPES)[number];

export const DAYCARE_MISSION_DIFFICULTIES = ['novice', 'apprentice', 'veteran', 'master'] as const;
export type DaycareMissionDifficulty = (typeof DAYCARE_MISSION_DIFFICULTIES)[number];

export interface MissionRequirement {
  type: DaycareMissionRequirementType;
  minLevel?: number;
  minIvTotal?: number;
  nature?: NatureId;
  stat31?: keyof PokemonIVs;
}

export interface MissionReward {
  id: ItemId;
  name: string; // domain-ok: UI Spanish text localization label
  qty: number;
  icon: string; // domain-ok: UI emoji icon
}

export interface DaycareSlot {
  pokemon: Pokemon | null;
  slotIndex: number;
  depositedAt?: string | null; // domain-ok: Open dynamic text or non-domain string payload
  deposited_at?: string | null; // domain-ok: Open dynamic text or non-domain string payload
}

export interface DaycareEgg {
  id: string; // domain-ok: unique egg instance id
  species: PokemonSpeciesId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  level: number;
  isEgg: boolean;
  steps: number;
  motherId?: string; // domain-ok: Open dynamic text or non-domain string payload
  mother_id?: string; // domain-ok: Open dynamic text or non-domain string payload
  depositedAt?: string; // domain-ok: Open dynamic text or non-domain string payload
  deposited_at?: string; // domain-ok: Open dynamic text or non-domain string payload
  ivs: PokemonIVs;
  nature: NatureId;
  movesAtBirth: PokemonMoveId[];
  abilityIndex: number;
  isShiny: boolean;
  cost: number;
  tint?: string; // domain-ok: Open dynamic text or non-domain string payload
  isAncestral?: boolean;
  inheritedIvs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number }; // open-record: Generic key-value data dictionary container
  inherited_ivs?: Record<string, unknown> & { _scanned?: boolean; _cost?: number }; // open-record: Generic key-value data dictionary container
}

export type DaycareWarehouseItem = DaycareEgg | Pokemon;

export interface DaycareMission {
  date: string; // domain-ok: Open dynamic text or non-domain string payload
  targetId: PokemonSpeciesId;
  requirement: MissionRequirement;
  reqText: string; // domain-ok: Open dynamic text or non-domain string payload
  reward: MissionReward;
  completed: boolean;
  trainerType: TrainerTypeKey;
  trainerName: string; // domain-ok: Open dynamic text or non-domain string payload
  trainerSprite: NpcSpriteId;
  dialogue: string; // domain-ok: Open dynamic text or non-domain string payload
}
