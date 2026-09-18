/**
 * src/logic/events/eventEngine.ts
 *
 * Event Engine - Global Event Multipliers and Core Orchestrator.
 * Delegates scheduling and sub-competition evaluation to specialized sub-modules.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

import { isPokemonSpeciesId, requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getGMT3Date } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation } from './eventSchedules.ts';
import type { SubCompetitionConfig } from './eventCompetitions.ts';

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
  banner?: string; // domain-ok: Open dynamic text or non-domain string payload
  metric?: string; // domain-ok: Open dynamic text or non-domain string payload
  hasCompetition?: boolean;
  competitionScope?: 'global' | 'per_species';
  sortBy?: string; // domain-ok: Open dynamic text or non-domain string payload
  requireCaughtDuringEvent?: boolean;
  catchStartDate?: string;
  catchEndDate?: string;
  subCompetitions?: SubCompetitionConfig[];
  minigameBuffs?: Record<string, MinigameEventBuffs>;
  customRules?: Array<{ label: string; value: string; color?: string }>;
  prizes?: {
    first?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
    second?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
    third?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
  };
  /** 4-week monthly rotation: week number (1-4) -> rotation data */
  rotationTheme?: RotationTheme;
  weeklyRotations?: Record<string, WeeklyRotationEntry>;
}

import type { EventTypeKind } from '@/types/system/stores';

export interface Event {
  id: string;
  name: string;
  description: string;
  type?: EventTypeKind;
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
export function getSpeciesBoosts(activeEvents: Event[], speciesId: PokemonSpeciesId): { rate: number; shiny: number } {
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

function applyExplicitMinigameBuffs(buffs: MinigameEventBuffs, mb?: Partial<MinigameEventBuffs>): void {
  if (!mb) return;
  if (mb.encounterRateMult) buffs.encounterRateMult = (buffs.encounterRateMult ?? 1) * mb.encounterRateMult;
  if (mb.successRateMult) buffs.successRateMult = (buffs.successRateMult ?? 1) * mb.successRateMult;
  if (mb.rareDropMult) buffs.rareDropMult = (buffs.rareDropMult ?? 1) * mb.rareDropMult;
  if (mb.shinyMult) buffs.shinyMult = (buffs.shinyMult ?? 1) * mb.shinyMult;
  if (mb.expMult) buffs.expMult = (buffs.expMult ?? 1) * mb.expMult;
  if (mb.scoreMult) buffs.scoreMult = (buffs.scoreMult ?? 1) * mb.scoreMult;
}

function applyShortcutMinigameBuffs(buffs: MinigameEventBuffs, minigameId: string, cfg: EventConfig): void { // infra-id-ok: Minigame string identifier
  if (minigameId === 'fishing' && cfg.fishingMult) {
    buffs.encounterRateMult = (buffs.encounterRateMult ?? 1) * cfg.fishingMult;
  }
  if (minigameId === 'archaeology' && cfg.archaeologyMult) {
    buffs.rareDropMult = (buffs.rareDropMult ?? 1) * cfg.archaeologyMult;
  }
  if (minigameId === 'bug_catching' && cfg.bugCatchingMult) {
    buffs.encounterRateMult = (buffs.encounterRateMult ?? 1) * cfg.bugCatchingMult;
  }
  if (minigameId === 'casino' && cfg.casinoLuckyMult) {
    buffs.rareDropMult = (buffs.rareDropMult ?? 1) * cfg.casinoLuckyMult;
  }
}

/**
 * Calculates aggregated buffs for a specific minigame across all currently active events.
 */
export function getMinigameBuffs(activeEvents: Event[], minigameId: string): MinigameEventBuffs { // infra-id-ok: Minigame string identifier
  const buffs: MinigameEventBuffs = {
    encounterRateMult: 1,
    successRateMult: 1,
    rareDropMult: 1,
    shinyMult: 1,
    expMult: 1,
    scoreMult: 1
  };

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    applyExplicitMinigameBuffs(buffs, cfg.minigameBuffs?.[minigameId]);
    applyShortcutMinigameBuffs(buffs, minigameId, cfg);
  }

  return buffs;
}
