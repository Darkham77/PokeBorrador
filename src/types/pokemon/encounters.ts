
import { Pokemon } from '@/types/pokemon/pokemon';
import type { DominanceInfo } from '@/types/system/stores';
import type { Event } from '@/logic/events/eventEngine';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { MapRouteId } from '@/data/world/map-assets';
import type { GymId } from '@/data/world/gyms';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { FactionId, PlayerClassId } from '@/types/system/game';
import type { ItemId } from '@/data/inventory/items';

export const ENCOUNTER_TYPES = ['wild', 'trainer', 'fishing', 'guardian', 'defender', 'archaeology', 'rival'] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

export const ADVENTURE_EVENT_TYPES = ['combat', 'combat_won', 'obstacle_cut', 'obstacle_strength', 'obstacle_rock_smash', 'fishing'] as const;
export type AdventureEventType = (typeof ADVENTURE_EVENT_TYPES)[number];

export const ROUTE_SPAWN_TABS = ['pokemon', 'item', 'fishing', 'npc'] as const;
export type RouteSpawnTab = (typeof ROUTE_SPAWN_TABS)[number];

export interface Encounter {
  type: EncounterType;
  pokemon?: Pokemon;
  rarity?: number;
  pts?: number;
  faction?: FactionId;
}

export interface MapLocation {
  id: MapRouteId;
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  icon?: string; // domain-ok: Open dynamic text or non-domain string payload
  badges?: number;
  desc?: string; // domain-ok: Open dynamic text or non-domain string payload
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  isMountain?: boolean;
  isPlains?: boolean;
  isForest?: boolean;
  isDesert?: boolean;
  isSwamp?: boolean;
  isCoastal?: boolean;
  isUrban?: boolean;
  isArctic?: boolean;
  isVolcanic?: boolean;
  supportedCycles?: DayPhase[];
  weatherEnabled?: boolean;
  wild?: {
    morning?: PokemonSpeciesId[];
    day?: PokemonSpeciesId[];
    dusk?: PokemonSpeciesId[];
    night?: PokemonSpeciesId[];
  };
  rates?: {
    morning?: number[];
    day?: number[];
    dusk?: number[];
    night?: number[];
  };
  lv: number[];
  fishing?: {
    pool: PokemonSpeciesId[];
    rates: number[];
    lv: number[];
  };
  archaeology?: {
    pool: PokemonSpeciesId[];
    rates: number[];
    lv: number[];
  };
  weather?: {
    [K in WeatherId]?: {
      exclusive?: PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>>;
      visitors?: PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>>;
      fishingExclusive?: PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>>;
      fishingVisitors?: PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>>;
    };
  };
  trainerChances?: Partial<Record<NpcArchetype, number>>;
}

export interface EncounterOptions {
  forceEncounter?: boolean;
  activeEvents?: Event[];
  shinyMultiplier?: number;
  weather?: WeatherId;
  cycle?: DayPhase;
  dominanceData?: Partial<Record<MapRouteId, DominanceInfo>> | null;
  eventTrainerBonus?: number;
  eventFishingBonus?: number;
  eventRivalBonus?: number;
}

export interface EncounterState {
  faction: FactionId | null;
  dailyGuardianCaptures?: MapRouteId[];
  repelSecs?: number;
  fishingRodSecs?: number;
  fishingRodType?: 'standard' | 'good' | 'super' | null;
  pickaxeSecs?: number;
  pickaxeType?: 'standard' | 'good' | 'super' | null;
  brushSecs?: number;
  brushType?: 'standard' | 'good' | 'super' | null;
  incenseSecs?: number;
  incenseType?: ItemId | null;
  team?: Pokemon[];
  trainerChance?: number;
  eloRating?: number;
  playerClass?: PlayerClassId | null;
  classLevel?: number;
  classData?: {
    criminality?: number;
    blackMarketSales?: number;
    [key: string]: unknown; // open-record: Generic key-value data dictionary container
  };
  gymProgress?: Partial<Record<GymId, { easy: boolean; normal: boolean; hard: boolean; attempts: number }>>;
}
