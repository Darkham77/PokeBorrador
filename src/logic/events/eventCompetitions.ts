/**
 * src/logic/events/eventCompetitions.ts
 *
 * Event Sub-Competitions, Scoring, and Rank Evaluation.
 * Pure logic for evaluating Pokémon against event categories.
 */

import type { Pokemon, PokemonStatKey, PokemonGender } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { normalizeZonedDateTime } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation } from './eventSchedules.ts';
import type { Event, EventConfig } from './eventEngine.ts';
import {
  resolveSubCompetitionDirection,
  evaluateIvsMetric,
  evaluateDimensionMetric,
  evaluateStatMetric,
  getSubCompIcon,
  getSubCompTitle,
  getSubCompDescription,
  parseEntryScore,
  parseEntryIsShiny,
  parseEntryObtainedAt,
  parseAwardPrizePayload,
  resolveAwardCategoryId,
  resolveAwardCategoryDetails
} from './eventCompetitionsHelper.ts';

export {
  resolveSubCompetitionDirection,
  getSubCompIcon,
  getSubCompTitle,
  getSubCompDescription
};

// Re-export eligibility functions and types
export * from './eventEligibility.ts';
import type { CompetitionEntry, PendingAward, PastCompetitionWinner } from '@/types/system/stores.ts';
export type { CompetitionEntry, PendingAward, PastCompetitionWinner };

// fallow-ignore-next-line unused-export
export const SUB_COMPETITION_METRICS = ['total_ivs', 'weight', 'height', 'level', 'stat_iv', 'friendship'] as const;
export type SubCompetitionMetric = (typeof SUB_COMPETITION_METRICS)[number];

// fallow-ignore-next-line unused-export
export const SUB_COMPETITION_ORDERS = ['max', 'min', 'auto'] as const;
export type SubCompetitionOrder = (typeof SUB_COMPETITION_ORDERS)[number];

// fallow-ignore-next-line unused-export
export const RESOLVED_SUB_COMPETITION_ORDERS = ['max', 'min'] as const;
export type ResolvedSubCompetitionOrder = (typeof RESOLVED_SUB_COMPETITION_ORDERS)[number];

export interface SubCompetitionFilters {
  natures?: string[];
  abilities?: string[];
  gender?: PokemonGender;
  minLevel?: number;
  maxLevel?: number;
  isShinyOnly?: boolean;
}

export interface SubCompetitionConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  metric: SubCompetitionMetric;
  targetStat?: PokemonStatKey;
  targetSpecies?: PokemonSpeciesId;
  speciesScope?: 'global' | 'per_species';
  order?: SubCompetitionOrder;
  filters?: SubCompetitionFilters;
  prizes?: {
    first?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
    second?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
    third?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
  };
}

export interface ResolvedSubCompetition extends SubCompetitionConfig {
  targetSpecies?: PokemonSpeciesId;
  speciesScope: 'global' | 'per_species';
}

export interface SubCompetitionEvaluationResult {
  score: number;
  displayValue: string;
  tierLabel?: string;
  ivs?: Pokemon['ivs'];
}

const DEFAULT_SUB_COMPETITIONS: readonly SubCompetitionConfig[] = [
  { id: 'ivs', name: 'Mayor IVs', metric: 'total_ivs', order: 'max' },
  { id: 'weight', name: 'Mayor/Menor Peso', metric: 'weight', order: 'auto' },
  { id: 'height', name: 'Mayor/Menor Altura', metric: 'height', order: 'auto' }
] as const;

/**
 * Returns the configured or default sub-competitions for an event.
 */
export function getDefaultSubCompetitions(event: Event): SubCompetitionConfig[] {
  const cfg = safeParse(event.config) as EventConfig;
  if (cfg.subCompetitions && Array.isArray(cfg.subCompetitions) && cfg.subCompetitions.length > 0) {
    return cfg.subCompetitions;
  }
  return [
    {
      id: 'ivs',
      name: 'Mayor IVs',
      description: 'Premia al Pokémon con mayor suma total de IVs (0 a 186).',
      metric: 'total_ivs',
      order: 'max'
    },
    {
      id: 'weight',
      name: 'Mayor/Menor Peso',
      description: 'Premia al Pokémon según el peso (kg).',
      metric: 'weight',
      order: 'auto'
    },
    {
      id: 'height',
      name: 'Mayor/Menor Altura',
      description: 'Premia al Pokémon según la altura (m).',
      metric: 'height',
      order: 'auto'
    }
  ];
}

/**
 * Evaluates a Pokémon instance against a sub-competition metric.
 */
export function evaluatePokemonForSubCompetition(
  pokemon: Pokemon,
  subComp: SubCompetitionConfig,
  _resolvedOrder: ResolvedSubCompetitionOrder = 'max'
): SubCompetitionEvaluationResult {
  if (!pokemon) {
    return { score: 0, displayValue: '0' };
  }

  if (subComp.metric === 'total_ivs' || subComp.metric === 'stat_iv') {
    return evaluateIvsMetric(pokemon, subComp);
  }

  if (subComp.metric === 'weight' || subComp.metric === 'height') {
    return evaluateDimensionMetric(pokemon, subComp.metric, _resolvedOrder);
  }

  if (subComp.metric === 'level' || subComp.metric === 'friendship') {
    return evaluateStatMetric(pokemon, subComp.metric);
  }

  return {
    score: 0,
    displayValue: '0'
  };
}

/**
 * Validates if the new entry is better for a competition based on score, shiny advantage, and capture date.
 */
export function isNewEntryBetter(
  existingData: unknown,
  newData: unknown,
  sortBy: string = 'data.score',
  order: ResolvedSubCompetitionOrder = 'max'
): boolean {
  if (!existingData) return true;

  const oldScore = parseEntryScore(existingData, sortBy);
  const newScore = parseEntryScore(newData, sortBy);

  // 1. Primary: Score comparison based on order
  if (order === 'min') {
    if (newScore < oldScore) return true;
    if (newScore > oldScore) return false;
  } else {
    if (newScore > oldScore) return true;
    if (newScore < oldScore) return false;
  }

  // 2. Tiebreaker 1: Shiny advantage (Shiny always beats non-Shiny)
  const oldShiny = parseEntryIsShiny(existingData);
  const newShiny = parseEntryIsShiny(newData);
  if (newShiny !== oldShiny) {
    return newShiny;
  }

  // 3. Tiebreaker 2: Older capture date (lower timestamp beats higher timestamp)
  const oldObtainedAt = parseEntryObtainedAt(existingData);
  const newObtainedAt = parseEntryObtainedAt(newData);
  return newObtainedAt < oldObtainedAt;
}

/**
 * Resolves the concrete list of sub-competitions for an event at a given point in time.
 */
export function resolveEventSubCompetitions(
  event: Event,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): ResolvedSubCompetition[] {
  const cfg = safeParse(event.config) as EventConfig | null;
  const rawSubComps = (cfg?.subCompetitions && cfg.subCompetitions.length > 0)
    ? cfg.subCompetitions
    : (DEFAULT_SUB_COMPETITIONS as SubCompetitionConfig[]);

  const zdt = normalizeZonedDateTime(date);
  const activeRotation = cfg ? resolveWeeklyRotation(cfg, zdt) : null;
  const effectiveSpeciesString = activeRotation?.species || cfg?.species || null;

  const isGlobalScope = cfg?.competitionScope === 'global' || effectiveSpeciesString === '*' || !effectiveSpeciesString;

  if (isGlobalScope) {
    return rawSubComps.map(sub => ({
      ...sub,
      speciesScope: 'global' as const,
      targetSpecies: undefined
    }));
  }

  const speciesList = effectiveSpeciesString
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(isPokemonSpeciesId);

  if (speciesList.length <= 1) {
    const singleSpecies = speciesList[0];
    return rawSubComps.map(sub => ({
      ...sub,
      speciesScope: (sub.metric === 'total_ivs' || sub.metric === 'stat_iv') ? ('global' as const) : ('per_species' as const),
      targetSpecies: (sub.metric === 'total_ivs' || sub.metric === 'stat_iv') ? undefined : singleSpecies
    }));
  }

  const resolved: ResolvedSubCompetition[] = [];

  for (const sub of rawSubComps) {
    if (sub.metric === 'total_ivs' || sub.metric === 'stat_iv' || sub.speciesScope === 'global') {
      resolved.push({
        ...sub,
        speciesScope: 'global' as const,
        targetSpecies: undefined
      });
    } else {
      for (const sp of speciesList) {
        const capitalizedSp = sp.charAt(0).toUpperCase() + sp.slice(1);
        resolved.push({
          ...sub,
          id: `${sub.id}_${sp}`,
          name: `${sub.name} (${capitalizedSp})`,
          targetSpecies: sp,
          speciesScope: 'per_species' as const
        });
      }
    }
  }

  return resolved;
}

export interface ResolvedAwardCategory {
  categoryId: string;
  categoryTitle: string;
  icon: string;
}

/**
 * Resolves the concrete category, title, and icon for an event award.
 * Inquires explicit award metadata, prize payloads, prize item match, and winner podio.
 */
export function resolveAwardCategory( // result-ok: Operation result wrapper payload
  award: PendingAward,
  event?: Event | null,
  winners?: PastCompetitionWinner[]
): ResolvedAwardCategory | null {
  const parsedPrize = parseAwardPrizePayload(award.prize);
  const subComps = event ? getDefaultSubCompetitions(event) : [];
  const catId = resolveAwardCategoryId(award, parsedPrize, subComps, winners);
  if (!catId) return null;

  const eventId = award.event_id || event?.id || '';
  const subComp = subComps.find(s => s.id === catId || catId.startsWith(s.id)) || null;

  return resolveAwardCategoryDetails(catId, eventId, subComp);
}

