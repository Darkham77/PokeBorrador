
import { Pokemon } from './pokemon.ts';
import type { DominanceInfo } from './stores.ts';
import type { Event } from '@/logic/events/eventEngine';

export type EncounterType = 'wild' | 'trainer' | 'fishing' | 'guardian' | 'defender';

export interface Encounter {
  type: EncounterType;
  pokemon?: Pokemon;
  rarity?: number;
  pts?: number;
  faction?: string;
}

export interface MapLocation {
  id: string;
  name: string;
  icon?: string;
  badges?: number;
  desc?: string;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  wild?: {
    morning?: string[];
    day?: string[];
    dusk?: string[];
    night?: string[];
    [key: string]: string[] | undefined;
  };
  rates?: {
    morning?: number[];
    day?: number[];
    dusk?: number[];
    night?: number[];
    [key: string]: number[] | undefined;
  };
  lv: number[];
  fishing?: {
    pool: string[];
    rates: number[];
    lv: number[];
  };
  weather?: {
    [key: string]: {
      exclusive?: string[] | Record<string, number | undefined>;
      visitors?: string[] | Record<string, number | undefined>;
    } | undefined;
  };
}

export interface EncounterOptions {
  forceEncounter?: boolean;
  activeEvents?: Event[];
  shinyMultiplier?: number;
  weather?: string;
  dominanceData?: Record<string, DominanceInfo> | null;
  eventTrainerBonus?: number;
  eventFishingBonus?: number;
}

export interface EncounterState {
  faction: string | null;
  dailyGuardianCaptures?: string[];
  repelSecs?: number;
  incenseSecs?: number;
  incenseType?: string | null;
  team?: Pokemon[];
  trainerChance?: number;
  eloRating?: number;
}
