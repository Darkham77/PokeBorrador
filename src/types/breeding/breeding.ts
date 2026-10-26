import type { DisplayText, IsoDateString, HexColor } from '@francogp/auditor';

import type { NatureId } from '@/data/battle/natures';
import type { ItemId } from '@/data/inventory/items';
import type { TrainerTypeKey } from '@/data/player/trainerTypes';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { Pokemon, PokemonIVs, PokemonMoveId } from '@/types/pokemon/pokemon';

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
  name: DisplayText;
  qty: number;
  icon: DisplayText;
}

export interface DaycareSlot {
  pokemon: Pokemon | null;
  slotIndex: number;
  depositedAt?: IsoDateString | null;
  deposited_at?: IsoDateString | null;
}

export interface DaycareEgg {
  id: DisplayText;
  species: PokemonSpeciesId;
  name: DisplayText;
  level: number;
  isEgg: boolean;
  steps: number;
  motherId?: DisplayText;
  mother_id?: DisplayText;
  depositedAt?: IsoDateString;
  deposited_at?: IsoDateString;
  ivs: PokemonIVs;
  nature: NatureId;
  movesAtBirth: PokemonMoveId[];
  abilityIndex: number;
  isShiny: boolean;
  cost: number;
  tint?: HexColor;
  isAncestral?: boolean;
  inheritedIvs?: Record<DisplayText, unknown> & { _scanned?: boolean; _cost?: number };
  inherited_ivs?: Record<DisplayText, unknown> & { _scanned?: boolean; _cost?: number };
}

export type DaycareWarehouseItem = DaycareEgg | Pokemon;

export interface DaycareMission {
  date: IsoDateString;
  targetId: PokemonSpeciesId;
  requirement: MissionRequirement;
  reqText: DisplayText;
  reward: MissionReward;
  completed: boolean;
  trainerType: TrainerTypeKey;
  trainerName: string; // domain-ok: Open dynamic text or non-domain string payload
  trainerSprite: NpcSpriteId;
  dialogue: string; // domain-ok: Open dynamic text or non-domain string payload
}
