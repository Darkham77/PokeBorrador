/**
 * src/logic/events/eventCompetitions.ts
 *
 * Event Sub-Competitions, Scoring, and Rank Evaluation.
 * Pure logic for evaluating Pokémon against event categories.
 */

import type { Pokemon, PokemonStatKey, PokemonGender } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { hashString, mulberry32 } from '@/logic/utils/math.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight, getPhysicalDimensionTier } from '@/logic/pokemon/physicalDimensionsMath.ts';
import { getPokemonTier } from '@/logic/pokemon/tierEngine.ts';
import { normalizeZonedDateTime } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation } from './eventSchedules.ts';
import type { Event, EventConfig } from './eventEngine.ts';

// Re-export eligibility functions
export * from './eventEligibility.ts';

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
    first?: Record<string, unknown>; // open-record
    second?: Record<string, unknown>; // open-record
    third?: Record<string, unknown>; // open-record
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
  { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
  { id: 'weight', name: 'Masa y Peso (Titán / Miniatura)', metric: 'weight', order: 'auto' },
  { id: 'height', name: 'Envergadura y Altura (Gran Salto)', metric: 'height', order: 'auto' }
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
      name: 'Genética Superior (IVs)',
      description: 'Premia al Pokémon con mayor potencial genético (suma total de IVs).',
      metric: 'total_ivs',
      order: 'max'
    },
    {
      id: 'weight',
      name: 'Masa y Peso (Titán / Miniatura)',
      description: 'Premia al ejemplar con mayor o menor peso según el ciclo del evento.',
      metric: 'weight',
      order: 'auto'
    },
    {
      id: 'height',
      name: 'Envergadura y Altura (Gran Salto)',
      description: 'Premia al ejemplar con mayor o menor altura según el ciclo del evento.',
      metric: 'height',
      order: 'auto'
    }
  ];
}

/**
 * Resolves the deterministic direction ('max' | 'min') for a sub-competition.
 */
export function resolveSubCompetitionDirection(
  eventId: string,
  categoryId: string,
  configuredOrder?: SubCompetitionOrder,
  epochSeed: number = 0
): ResolvedSubCompetitionOrder {
  if (configuredOrder === 'min') return 'min';
  if (configuredOrder === 'max') return 'max';
  if (categoryId === 'ivs') return 'max';

  const hash = hashString(`${eventId}:${categoryId}:${epochSeed}`);
  const prng = mulberry32(hash);
  return prng() >= 0.5 ? 'max' : 'min';
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

  if (subComp.metric === 'total_ivs') {
    const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
    const tier = getPokemonTier(pokemon);
    return {
      score: totalIvs,
      displayValue: `${totalIvs} / 186 (${tier.tier})`,
      ivs,
      tierLabel: tier.tier
    };
  }

  if (subComp.metric === 'stat_iv' && subComp.targetStat) {
    const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const statVal = ivs[subComp.targetStat] || 0;
    return {
      score: statVal,
      displayValue: `${statVal} / 31`,
      ivs
    };
  }

  if (subComp.metric === 'weight') {
    const weightNum = getPokemonPhysicalWeight(pokemon);
    const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
    const baseWeight = spec?.weight || null;
    const tier = getPhysicalDimensionTier(weightNum, baseWeight);
    const maxTarget = baseWeight ? (baseWeight * 1.15).toFixed(1) : null;
    const minTarget = baseWeight ? (baseWeight * 0.85).toFixed(1) : null;
    const targetRef = _resolvedOrder === 'min' ? minTarget : maxTarget;
    const targetStr = targetRef ? ` / ${targetRef} kg` : '';
    return {
      score: Number(weightNum.toFixed(1)),
      displayValue: `${weightNum.toFixed(1)} kg${targetStr} (${tier.label} · ${tier.name})`,
      tierLabel: `${tier.label} · ${tier.name}`
    };
  }

  if (subComp.metric === 'height') {
    const heightNum = getPokemonPhysicalHeight(pokemon);
    const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
    const baseHeight = spec?.height || null;
    const tier = getPhysicalDimensionTier(heightNum, baseHeight);
    const maxTarget = baseHeight ? (baseHeight * 1.15).toFixed(1) : null;
    const minTarget = baseHeight ? (baseHeight * 0.85).toFixed(1) : null;
    const targetRef = _resolvedOrder === 'min' ? minTarget : maxTarget;
    const targetStr = targetRef ? ` / ${targetRef} m` : '';
    return {
      score: Number(heightNum.toFixed(1)),
      displayValue: `${heightNum.toFixed(1)} m${targetStr} (${tier.label} · ${tier.name})`,
      tierLabel: `${tier.label} · ${tier.name}`
    };
  }

  if (subComp.metric === 'level') {
    const lvl = pokemon.level || 1;
    return {
      score: lvl,
      displayValue: `Nv. ${lvl} / 100`
    };
  }

  if (subComp.metric === 'friendship') {
    const friendship = pokemon.friendship || 0;
    return {
      score: friendship,
      displayValue: `${friendship} / 255`
    };
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
  order: 'max' | 'min' = 'max'
): boolean {
  if (!existingData) return true;
  
  const toRecord = (obj: unknown): Record<string, unknown> | null => {
    return (obj && typeof obj === 'object') ? (obj as Record<string, unknown>) : null; // open-record
  };

  const getVal = (obj: unknown, path: string): number => {
    const rec = toRecord(obj);
    if (!rec) return 0;

    const directVal = path.split('.').reduce((acc: unknown, part: string) => toRecord(acc)?.[part], rec) as number | undefined;
    if (typeof directVal === 'number' && !isNaN(directVal)) return directVal;

    const strippedPath = path.startsWith('data.') ? path.slice(5) : path;
    const strippedVal = strippedPath.split('.').reduce((acc: unknown, part: string) => toRecord(acc)?.[part], rec) as number | undefined;
    if (typeof strippedVal === 'number' && !isNaN(strippedVal)) return strippedVal;

    const dataRec = toRecord(rec.data);
    const scoreVal = (rec.score ?? dataRec?.score ?? rec.total_ivs ?? dataRec?.total_ivs) as number | undefined;
    if (typeof scoreVal === 'number' && !isNaN(scoreVal)) return scoreVal;

    return 0;
  };

  const getIsShiny = (obj: unknown): boolean => {
    const rec = toRecord(obj);
    if (!rec) return false;
    const dataRec = toRecord(rec.data);
    return Boolean(rec.is_shiny ?? dataRec?.is_shiny ?? rec.isShiny);
  };

  const getObtainedAt = (obj: unknown): number => {
    const rec = toRecord(obj);
    if (!rec) return Infinity;
    const dataRec = toRecord(rec.data);
    const val = (rec.obtained_at ?? dataRec?.obtained_at ?? rec.obtainedAt) as number | null | undefined;
    return typeof val === 'number' && !isNaN(val) && val > 0 ? val : Infinity;
  };

  const oldScore = getVal(existingData, sortBy);
  const newScore = getVal(newData, sortBy);

  // 1. Primary: Score comparison based on order
  if (order === 'min') {
    if (newScore < oldScore) return true;
    if (newScore > oldScore) return false;
  } else {
    if (newScore > oldScore) return true;
    if (newScore < oldScore) return false;
  }

  // 2. Tiebreaker 1: Shiny advantage (Shiny always beats non-Shiny)
  const oldShiny = getIsShiny(existingData);
  const newShiny = getIsShiny(newData);
  if (newShiny && !oldShiny) return true;
  if (!newShiny && oldShiny) return false;

  // 3. Tiebreaker 2: Older capture date (lower timestamp beats higher timestamp)
  const oldObtainedAt = getObtainedAt(existingData);
  const newObtainedAt = getObtainedAt(newData);
  if (newObtainedAt < oldObtainedAt) return true;

  return false;
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

export function getSubCompIcon(metric: string): string {
  if (metric === 'total_ivs' || metric === 'stat_iv') return '🧬';
  if (metric === 'weight') return '⚖️';
  if (metric === 'height') return '📏';
  if (metric === 'level') return '⭐';
  if (metric === 'friendship') return '💖';
  return '🏆';
}

export function getSubCompTitle(eventId: string, sub: SubCompetitionConfig): string {
  const dir = resolveSubCompetitionDirection(eventId, sub.id, sub.order);
  if (sub.metric === 'total_ivs') {
    return 'Mayor IVs Totales';
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}`; // domain-ok
  }
  if (sub.metric === 'weight') {
    return dir === 'max' ? 'Mayor Peso (Titán)' : 'Menor Peso (Miniatura)';
  }
  if (sub.metric === 'height') {
    return dir === 'max' ? 'Mayor Altura (Gran Salto)' : 'Menor Altura (Miniatura)';
  }
  if (sub.metric === 'level') {
    return dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel';
  }
  if (sub.metric === 'friendship') {
    return dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad';
  }
  return sub.name || 'Categoría';
}

