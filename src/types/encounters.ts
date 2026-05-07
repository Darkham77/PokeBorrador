
import { Pokemon } from './pokemon';

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
  weather?: Record<string, {
    exclusive?: string[] | Record<string, number>;
    visitors?: string[] | Record<string, number>;
  }>;
}

export interface EncounterOptions {
  forceEncounter?: boolean;
  activeEvents?: any[];
  shinyMultiplier?: number;
  weather?: string;
  dominanceData?: Record<string, string> | null;
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
