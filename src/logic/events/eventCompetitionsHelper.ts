/**
 * src/logic/events/eventCompetitionsHelper.ts
 *
 * Modular helper utilities for event sub-competitions, metrics evaluation,
 * tiebreaking, titles, descriptions, and award category resolution.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PendingAward, PastCompetitionWinner } from '@/types/system/stores.ts';
import { hashString, mulberry32 } from '@/logic/utils/math.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight, getPhysicalDimensionTier } from '@/logic/pokemon/physicalDimensionsMath.ts';
import { getPokemonTier } from '@/logic/pokemon/tierEngine.ts';
import { calculateTotalIVs } from '@/logic/pokemon/statsMath.ts';
import type {
  SubCompetitionConfig,
  SubCompetitionOrder,
  SubCompetitionEvaluationResult,
  ResolvedSubCompetitionOrder,
  ResolvedAwardCategory
} from './eventCompetitions.ts';

const TARGET_MAX_MULTIPLIER = 1.15;
const TARGET_MIN_MULTIPLIER = 0.85;

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

export function evaluateIvsMetric(
  pokemon: Pokemon,
  subComp: SubCompetitionConfig
): SubCompetitionEvaluationResult {
  const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (subComp.metric === 'stat_iv' && subComp.targetStat) {
    const statVal = ivs[subComp.targetStat] || 0;
    return {
      score: statVal,
      displayValue: `${statVal} / 31`,
      ivs
    };
  }
  const totalIvs = calculateTotalIVs(pokemon.ivs);
  const tier = getPokemonTier(pokemon);
  return {
    score: totalIvs,
    displayValue: `${totalIvs} / 186 (${tier.tier})`,
    ivs,
    tierLabel: tier.tier
  };
}

export function evaluateDimensionMetric(
  pokemon: Pokemon,
  metric: 'weight' | 'height',
  resolvedOrder: ResolvedSubCompetitionOrder
): SubCompetitionEvaluationResult {
  const isWeight = metric === 'weight';
  const rawNum = isWeight ? getPokemonPhysicalWeight(pokemon) : getPokemonPhysicalHeight(pokemon);
  const unit = isWeight ? 'kg' : 'm';
  const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
  const baseDim = isWeight ? (spec?.weight || null) : (spec?.height || null);
  const tier = getPhysicalDimensionTier(rawNum, baseDim);

  const maxTarget = baseDim ? (baseDim * TARGET_MAX_MULTIPLIER).toFixed(1) : null;
  const minTarget = baseDim ? (baseDim * TARGET_MIN_MULTIPLIER).toFixed(1) : null;
  const targetRef = resolvedOrder === 'min' ? minTarget : maxTarget;
  const targetStr = targetRef ? ` / ${targetRef} ${unit}` : '';

  return {
    score: Number(rawNum.toFixed(1)),
    displayValue: `${rawNum.toFixed(1)} ${unit}${targetStr} (${tier.label} · ${tier.name})`,
    tierLabel: `${tier.label} · ${tier.name}`
  };
}

export function evaluateStatMetric(
  pokemon: Pokemon,
  metric: 'level' | 'friendship'
): SubCompetitionEvaluationResult {
  if (metric === 'level') {
    const lvl = pokemon.level || 1;
    return {
      score: lvl,
      displayValue: `Nv. ${lvl} / 100`
    };
  }
  const friendship = pokemon.friendship || 0;
  return {
    score: friendship,
    displayValue: `${friendship} / 255`
  };
}

export function getSubCompIcon(metric: string): string {
  if (metric === 'total_ivs' || metric === 'stat_iv') return '🧬';
  if (metric === 'weight') return '⚖️';
  if (metric === 'height') return '📏';
  if (metric === 'level') return '⭐';
  if (metric === 'friendship') return '💖';
  return '🏆';
}

const METRIC_TITLES: Record<string, { max: string; min: string }> = {
  weight: { max: 'Mayor Peso', min: 'Menor Peso' },
  height: { max: 'Mayor Altura', min: 'Menor Altura' },
  level: { max: 'Mayor Nivel', min: 'Menor Nivel' },
  friendship: { max: 'Mayor Amistad', min: 'Menor Amistad' }
};

export function getSubCompTitle(eventId: string, sub: SubCompetitionConfig): string {
  const dir = resolveSubCompetitionDirection(eventId, sub.id, sub.order);
  const speciesSuffix = sub.targetSpecies ? ` (${sub.targetSpecies.toUpperCase()})` : '';

  if (sub.metric === 'total_ivs') {
    return `Mayor IVs${speciesSuffix}`;
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}${speciesSuffix}`; // domain-ok: Open dynamic text or non-domain string payload
  }
  const labelEntry = METRIC_TITLES[sub.metric];
  if (labelEntry) {
    return labelEntry[dir] + speciesSuffix;
  }
  return (sub.name || 'Categoría') + speciesSuffix;
}

const METRIC_DESCRIPTIONS: Record<string, { max: string; min: string }> = {
  weight: { max: 'Premia al Pokémon con Mayor Peso (kg)', min: 'Premia al Pokémon con Menor Peso (kg)' },
  height: { max: 'Premia al Pokémon con Mayor Altura (m)', min: 'Premia al Pokémon con Menor Altura (m)' },
  level: { max: 'Premia al Pokémon con Mayor Nivel', min: 'Premia al Pokémon con Menor Nivel' },
  friendship: { max: 'Premia al Pokémon con Mayor Amistad (0 a 255)', min: 'Premia al Pokémon con Menor Amistad' }
};

export function getSubCompDescription(eventId: string, sub: SubCompetitionConfig): string {
  const dir = resolveSubCompetitionDirection(eventId, sub.id, sub.order);
  const speciesText = sub.targetSpecies ? ` para ${sub.targetSpecies.toUpperCase()}` : '';

  if (sub.metric === 'total_ivs') {
    return `Premia al Pokémon con mayor suma total de IVs (0 a 186)${speciesText}.`;
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Premia al Pokémon con mayor IV en ${sub.targetStat.toUpperCase()} (0 a 31)${speciesText}.`;
  }
  const descEntry = METRIC_DESCRIPTIONS[sub.metric];
  if (descEntry) {
    return `${descEntry[dir]}${speciesText}.`;
  }
  return sub.description || `Compite por el mejor puntaje en ${sub.name}.`;
}

function toRecord(obj: unknown): Record<string, unknown> | null {
  return (obj && typeof obj === 'object') ? (obj as Record<string, unknown>) : null; // open-record: Generic key-value data dictionary container
}

function extractDeepNumber(rec: Record<string, unknown>, path: string): number | null {
  const parts = path.split('.');
  let curr: unknown = rec;
  for (const part of parts) {
    if (!curr || typeof curr !== 'object') return null;
    curr = (curr as Record<string, unknown>)[part]; // open-record: Generic key-value data dictionary container
  }
  return typeof curr === 'number' && !isNaN(curr) ? curr : null;
}

export function parseEntryScore(obj: unknown, sortBy: string): number {
  const rec = toRecord(obj);
  if (!rec) return 0;

  const directVal = extractDeepNumber(rec, sortBy);
  if (directVal !== null) return directVal;

  const strippedPath = sortBy.startsWith('data.') ? sortBy.slice(5) : sortBy;
  const strippedVal = extractDeepNumber(rec, strippedPath);
  if (strippedVal !== null) return strippedVal;

  const dataRec = toRecord(rec.data);
  const scoreVal = (rec.score ?? dataRec?.score ?? rec.total_ivs ?? dataRec?.total_ivs) as number | undefined;
  return typeof scoreVal === 'number' && !isNaN(scoreVal) ? scoreVal : 0;
}

export function parseEntryIsShiny(obj: unknown): boolean {
  const rec = toRecord(obj);
  if (!rec) return false;
  const dataRec = toRecord(rec.data);
  return Boolean(rec.is_shiny ?? dataRec?.is_shiny ?? rec.isShiny);
}

export function parseEntryObtainedAt(obj: unknown): number {
  const rec = toRecord(obj);
  if (!rec) return Infinity;
  const dataRec = toRecord(rec.data);
  const val = (rec.obtained_at ?? dataRec?.obtained_at ?? rec.obtainedAt) as number | null | undefined;
  return typeof val === 'number' && !isNaN(val) && val > 0 ? val : Infinity;
}

export function parseAwardPrizePayload(rawPrize: unknown): Record<string, unknown> {
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    } catch {
      return {};
    }
  }
  if (typeof rawPrize === 'object' && rawPrize !== null) {
    return rawPrize as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  }
  return {};
}

function hasMatchingPrizeItems(candidatePrize: unknown, prizeItems: Record<string, number>): boolean {
  if (!candidatePrize || typeof candidatePrize !== 'object') return false;
  const candidateItems = ((candidatePrize as Record<string, unknown>).items || {}) as Record<string, number>; // open-record: Generic key-value data dictionary container
  const candidateKeys = Object.keys(candidateItems);
  return candidateKeys.length > 0 && candidateKeys.every(k => k in prizeItems);
}

function matchCategoryIdFromPrizeItems(
  prizeItems: Record<string, number>,
  subComps: readonly SubCompetitionConfig[]
): string | null {
  const prizeItemKeys = Object.keys(prizeItems);
  if (prizeItemKeys.length === 0) return null;

  for (const sub of subComps) {
    if (!sub.prizes) continue;
    const { first, second, third } = sub.prizes;
    if (
      hasMatchingPrizeItems(first, prizeItems) ||
      hasMatchingPrizeItems(second, prizeItems) ||
      hasMatchingPrizeItems(third, prizeItems)
    ) {
      return sub.id;
    }
  }
  return null;
}

function matchCategoryIdFromWinners(
  award: PendingAward,
  winners?: PastCompetitionWinner[]
): string | null {
  if (!winners || winners.length === 0) return null;
  const userWinners = award.winner_id ? winners.filter(w => w.player_id === award.winner_id) : winners;
  if (userWinners.length === 1 && userWinners[0]?.category_id) {
    return userWinners[0].category_id;
  }
  return null;
}

function parseCategoryIdFromAwardId(awardId?: string): string | null {
  if (!awardId || !awardId.startsWith('award_')) return null;
  const parts = awardId.split('_');
  if (parts.length >= 3 && parts[2]) {
    return parts[2];
  }
  return null;
}

export function resolveAwardCategoryId(
  award: PendingAward,
  parsedPrize: Record<string, unknown>,
  subComps: readonly SubCompetitionConfig[] = [],
  winners?: PastCompetitionWinner[]
): string | null {
  const directCatId = (award.category_id || (parsedPrize.category_id as string | undefined) || '') as string;
  if (directCatId) return directCatId;

  if (subComps.length > 0) {
    const prizeItems = (parsedPrize.items || {}) as Record<string, number>; // open-record: Generic key-value data dictionary container
    const matchedId = matchCategoryIdFromPrizeItems(prizeItems, subComps);
    if (matchedId) return matchedId;
  }

  const winnerCatId = matchCategoryIdFromWinners(award, winners);
  if (winnerCatId) return winnerCatId;

  return parseCategoryIdFromAwardId(award.id);
}

const PREFIX_VISUALS: readonly {
  prefix: string;
  title: (eventId: string, catId: string) => string;
  icon: string;
}[] = [
  {
    prefix: 'weight',
    title: (eventId, catId) => getSubCompTitle(eventId, { id: catId, metric: 'weight', order: 'auto', name: 'Peso' }),
    icon: '⚖️'
  },
  {
    prefix: 'height',
    title: (eventId, catId) => getSubCompTitle(eventId, { id: catId, metric: 'height', order: 'auto', name: 'Altura' }),
    icon: '📏'
  },
  { prefix: 'friendship', title: () => 'Mayor Amistad', icon: '💖' },
  { prefix: 'level', title: () => 'Mayor Nivel', icon: '⭐' },
  { prefix: 'ivs', title: () => 'Mayor IVs', icon: '🧬' }
];

export function resolveAwardCategoryDetails(
  catId: string,
  eventId: string,
  subComp?: SubCompetitionConfig | null
): ResolvedAwardCategory {
  if (subComp) {
    return {
      categoryId: catId,
      categoryTitle: getSubCompTitle(eventId, subComp),
      icon: subComp.icon || getSubCompIcon(subComp.metric)
    };
  }

  for (const entry of PREFIX_VISUALS) {
    if (catId.startsWith(entry.prefix)) {
      return {
        categoryId: catId,
        categoryTitle: entry.title(eventId, catId),
        icon: entry.icon
      };
    }
  }

  return {
    categoryId: catId,
    categoryTitle: 'Mayor IVs',
    icon: '🏆'
  };
}
