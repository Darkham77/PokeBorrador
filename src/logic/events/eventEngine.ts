/**
 * src/logic/events/eventEngine.ts
 *
 * Event Engine - Global Event Multipliers and Core Orchestrator.
 * Delegates scheduling and sub-competition evaluation to specialized sub-modules.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getGMT3Date } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation } from './eventSchedules.ts';

// Re-export scheduling and date helpers
export * from './eventSchedules.ts';

// Re-export sub-competitions and eligibility helpers
export * from './eventCompetitions.ts';

export type RotationTheme = 'weekly_4';

export interface WeeklyRotationEntry {
  species: string;
  banner: string;
  title: string;
}

export interface MinigameEventBuffs {
  encounterRateMult?: number;
  successRateMult?: number;
  rareDropMult?: number;
  shinyMult?: number;
  expMult?: number;
  scoreMult?: number;
  [key: string]: unknown;
}

export interface EventConfig {
  expMult?: number;
  moneyMult?: number;
  bcMult?: number;
  catchRateMult?: number;
  shinyMult?: number;
  eggShinyMult?: number;
  hatchMult?: number;
  rivalMult?: number;
  trainerMult?: number;
  fishingMult?: number;
  archaeologyMult?: number;
  bugCatchingMult?: number;
  casinoLuckyMult?: number;
  /** Comma-separated species IDs. Use "*" for open (any species) competitions. */
  species?: string;
  speciesRateMult?: number;
  speciesShinyMult?: number;
  ignoreTimeRestrictions?: boolean;
  banner?: string; // domain-ok
  metric?: string; // domain-ok
  hasCompetition?: boolean;
  competitionScope?: 'global' | 'per_species';
  sortBy?: string; // domain-ok
  requireCaughtDuringEvent?: boolean;
  catchStartDate?: string;
  catchEndDate?: string;
  subCompetitions?: import('./eventCompetitions.ts').SubCompetitionConfig[];
  minigameBuffs?: Record<string, MinigameEventBuffs>;
  customRules?: Array<{ label: string; value: string; color?: string }>;
  prizes?: {
    first?: Record<string, unknown>; // open-record
    second?: Record<string, unknown>; // open-record
    third?: Record<string, unknown>; // open-record
  };
  /** 4-week monthly rotation: week number (1-4) -> rotation data */
  rotationTheme?: RotationTheme;
  weeklyRotations?: Record<string, WeeklyRotationEntry>;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  type?: 'competition' | 'boost' | 'passive_bonus';
  icon?: string;
  active: boolean;
  manual?: boolean;
  start_at?: string;
  end_at?: string;
  schedule?: string | Record<string, unknown>;
  config?: string | EventConfig;
}

export interface GlobalMultipliers {
  exp: number;
  money: number;
  bc: number;
  catch: number;
  catchRate: number;
  shiny: number;
  eggShiny: number;
  hatch: number;
  rival: number;
  trainer: number;
  fishing: number;
  archaeology: number;
  bugCatching: number;
  casinoLucky: number;
}

/**
 * Calculates global multipliers from a list of active events.
 */
export function getGlobalMultipliers(activeEvents: Event[]): GlobalMultipliers {
  const multipliers: GlobalMultipliers = {
    exp: 1,
    money: 1,
    bc: 1,
    catch: 1,
    catchRate: 1,
    shiny: 1,
    eggShiny: 1,
    hatch: 1,
    rival: 1,
    trainer: 1,
    fishing: 1,
    archaeology: 1,
    bugCatching: 1,
    casinoLucky: 1
  };

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    multipliers.exp *= (cfg.expMult || 1);
    multipliers.money *= (cfg.moneyMult || 1);
    multipliers.bc *= (cfg.bcMult || 1);
    multipliers.catch *= (cfg.catchRateMult || 1);
    multipliers.catchRate *= (cfg.catchRateMult || 1);
    multipliers.shiny *= (cfg.shinyMult || 1);
    multipliers.eggShiny *= (cfg.eggShinyMult || 1);
    multipliers.hatch *= (cfg.hatchMult || 1);
    multipliers.rival *= (cfg.rivalMult || 1);
    multipliers.trainer *= (cfg.trainerMult || 1);
    multipliers.fishing *= (cfg.fishingMult || 1);
    multipliers.archaeology *= (cfg.archaeologyMult || 1);
    multipliers.bugCatching *= (cfg.bugCatchingMult || 1);
    multipliers.casinoLucky *= (cfg.casinoLuckyMult || 1);
  }

  return multipliers;
}

/**
 * Checks if a specific species has active boosts.
 */
export function getSpeciesBoosts(activeEvents: Event[], speciesId: string): { rate: number; shiny: number } {
  let rateMult = 1;
  let shinyMult = 1;
  if (!isPokemonSpeciesId(speciesId)) return { rate: rateMult, shiny: shinyMult };
  const sId = requirePokemonSpeciesId(speciesId);

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, getGMT3Date()) : null;
    const rawSpecies = rotation?.species ?? cfg.species;
    if (!rawSpecies || rawSpecies === '*') continue;

    const speciesList = rawSpecies.split(',').map(s => s.trim().toLowerCase()).filter(isPokemonSpeciesId);
    if (speciesList.includes(sId)) {
      rateMult *= (cfg.speciesRateMult || 1);
      shinyMult *= (cfg.speciesShinyMult || 1);
    }
  }

  return { rate: rateMult, shiny: shinyMult };
}

/**
 * Calculates aggregated buffs for a specific minigame across all currently active events.
 */
export function getMinigameBuffs(activeEvents: Event[], minigameId: string): MinigameEventBuffs {
  let encounterRateMult = 1;
  let successRateMult = 1;
  let rareDropMult = 1;
  let shinyMult = 1;
  let expMult = 1;
  let scoreMult = 1;

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    if (cfg.minigameBuffs && cfg.minigameBuffs[minigameId]) {
      const mb = cfg.minigameBuffs[minigameId];
      if (mb.encounterRateMult) encounterRateMult *= mb.encounterRateMult;
      if (mb.successRateMult) successRateMult *= mb.successRateMult;
      if (mb.rareDropMult) rareDropMult *= mb.rareDropMult;
      if (mb.shinyMult) shinyMult *= mb.shinyMult;
      if (mb.expMult) expMult *= mb.expMult;
      if (mb.scoreMult) scoreMult *= mb.scoreMult;
    }
    // Direct shortcut mappings for standard minigames
    if (minigameId === 'fishing' && cfg.fishingMult) {
      encounterRateMult *= cfg.fishingMult;
    }
    if (minigameId === 'archaeology' && cfg.archaeologyMult) {
      rareDropMult *= cfg.archaeologyMult;
    }
    if (minigameId === 'bug_catching' && cfg.bugCatchingMult) {
      encounterRateMult *= cfg.bugCatchingMult;
    }
    if (minigameId === 'casino' && cfg.casinoLuckyMult) {
      rareDropMult *= cfg.casinoLuckyMult;
    }
  }

  return { encounterRateMult, successRateMult, rareDropMult, shinyMult, expMult, scoreMult };
}
