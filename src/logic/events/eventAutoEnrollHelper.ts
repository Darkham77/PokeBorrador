/**
 * src/logic/events/eventAutoEnrollHelper.ts
 *
 * Evaluation and auto-enrollment logic for event competitions.
 * Determines if a captured Pokémon beats a player's record across any active sub-competition,
 * and computes optimal greedy assignment for one-click auto-fill in Home.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import type { CompetitionEntry } from '@/types/system/stores';
import { isPokemonBusy } from '@/logic/constants/tags.ts';
import {
  resolveEventSubCompetitions,
  resolveSubCompetitionDirection,
  evaluatePokemonForSubCompetition,
  isPokemonEligibleForSubCompetition,
  isNewEntryBetter,
  getSubCompTitle,
  getSubCompIcon,
  type Event as GameEvent,
  type ResolvedSubCompetition,
  type SubCompetitionMetric,
  type ResolvedSubCompetitionOrder
} from './eventEngine.ts';

function toDynamicRecord(val: unknown): Record<string, unknown> {
  if (typeof val === 'string') {
    try {
      const parsed: unknown = JSON.parse(val);
      return (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {}; // open-record: Dynamic JSON event payload dictionary
    } catch {
      return {};
    }
  }
  return (val && typeof val === 'object') ? (val as Record<string, unknown>) : {}; // open-record: Dynamic JSON event payload dictionary
}

export interface AutoEnrollCandidateCategory {
  readonly eventId: string;
  readonly eventName: string;
  readonly categoryId: string;
  readonly categoryTitle: string;
  readonly icon: string;
  readonly metric: SubCompetitionMetric;
  readonly order: ResolvedSubCompetitionOrder;
  readonly newScore: number;
  readonly newDisplayValue: string;
  readonly previousScore?: number;
  readonly previousDisplayValue?: string;
  readonly deltaLabel: string;
  readonly isFirstEntry: boolean;
}

export interface OptimalAutoFillAssignment {
  readonly subComp: ResolvedSubCompetition;
  readonly pokemon: Pokemon;
  readonly score: number;
  readonly displayValue: string;
  readonly isImprovement: boolean;
}

/**
 * Evaluates whether a newly captured Pokémon is eligible and improves the player's
 * current score in any active competition category.
 */
export function evaluateCapturedPokemonForEvents(
  pokemon: Pokemon,
  activeEvents: readonly GameEvent[],
  userEntries: Readonly<Record<string, CompetitionEntry>>,
  serverInstant: Temporal.Instant = Temporal.Now.instant()
): AutoEnrollCandidateCategory[] {
  if (!pokemon || !Array.isArray(activeEvents) || activeEvents.length === 0) {
    return [];
  }

  const results: AutoEnrollCandidateCategory[] = [];

  for (const event of activeEvents) {
    if (event.type !== 'competition') continue;

    const subComps = resolveEventSubCompetitions(event, serverInstant);
    if (!subComps || subComps.length === 0) continue;

    for (const subComp of subComps) {
      const eligibility = isPokemonEligibleForSubCompetition(event, subComp, pokemon, serverInstant);
      if (!eligibility.eligible) continue;

      const order = resolveSubCompetitionDirection(event.id, subComp.id, subComp.order);
      const evaluation = evaluatePokemonForSubCompetition(pokemon, subComp, order);

      const entryKey = `${event.id}:${subComp.id}`;
      const existingEntry = userEntries[entryKey] || (subComp.id === 'ivs' ? userEntries[event.id] : undefined);

      const newData = {
        score: evaluation.score,
        is_shiny: Boolean(pokemon.isShiny),
        obtained_at: pokemon.obtainedAt || serverInstant.epochMilliseconds
      };

      const isFirst = !existingEntry;
      const isBetter = isFirst || isNewEntryBetter(existingEntry, newData, 'score', order);

      if (isBetter) {
        let deltaLabel = '¡Primer registro!';
        let previousScore: number | undefined;
        let previousDisplayValue: string | undefined;

        if (existingEntry) {
          const rawData = toDynamicRecord(existingEntry.data);
          
          previousScore = typeof rawData.score === 'number' ? rawData.score : (rawData.total_ivs as number | undefined);
          previousDisplayValue = typeof rawData.display_value === 'string' ? rawData.display_value : String(previousScore ?? 0);

          if (previousScore !== undefined) {
            const diff = evaluation.score - previousScore;
            const sign = diff >= 0 ? '+' : '';
            deltaLabel = `${sign}${Number(diff.toFixed(2))}`;
          }
        }

        results.push({
          eventId: event.id,
          eventName: event.name,
          categoryId: subComp.id,
          categoryTitle: getSubCompTitle(event.id, subComp),
          icon: subComp.icon || getSubCompIcon(subComp.metric),
          metric: subComp.metric,
          order,
          newScore: evaluation.score,
          newDisplayValue: evaluation.displayValue,
          previousScore,
          previousDisplayValue,
          deltaLabel,
          isFirstEntry: isFirst
        });
      }
    }
  }

  return results;
}

/**
 * Solves optimal assignment of available Pokémon to event categories without overlap.
 * Each Pokémon can only be enrolled in ONE category per event.
 */
export function computeOptimalAutoFillAssignments(
  event: GameEvent,
  availablePokemon: readonly Pokemon[],
  existingEntries: Readonly<Record<string, CompetitionEntry>>,
  serverInstant: Temporal.Instant = Temporal.Now.instant()
): OptimalAutoFillAssignment[] {
  if (event.type !== 'competition' || !availablePokemon.length) {
    return [];
  }

  const subComps = resolveEventSubCompetitions(event, serverInstant);
  if (!subComps.length) return [];

  interface CandidateEvaluation {
    pokemon: Pokemon;
    subComp: ResolvedSubCompetition;
    score: number;
    displayValue: string;
    isBetter: boolean;
    priorityDelta: number;
  }

  const allCandidateEvals: CandidateEvaluation[] = [];

  for (const subComp of subComps) {
    const order = resolveSubCompetitionDirection(event.id, subComp.id, subComp.order);
    const entryKey = `${event.id}:${subComp.id}`;
    const existingEntry = existingEntries[entryKey] || (subComp.id === 'ivs' ? existingEntries[event.id] : undefined);

    for (const p of availablePokemon) {
      if (isPokemonBusy(p)) continue;

      const eligibility = isPokemonEligibleForSubCompetition(event, subComp, p, serverInstant);
      if (!eligibility.eligible) continue;

      const evaluation = evaluatePokemonForSubCompetition(p, subComp, order);
      const newData = {
        score: evaluation.score,
        is_shiny: Boolean(p.isShiny),
        obtained_at: p.obtainedAt || serverInstant.epochMilliseconds
      };

      const isFirst = !existingEntry;
      const isBetter = isFirst || isNewEntryBetter(existingEntry, newData, 'score', order);

      let priorityDelta = evaluation.score;
      if (order === 'min') {
        priorityDelta = -evaluation.score;
      }
      if (existingEntry) {
        const rawData = toDynamicRecord(existingEntry.data);
        const prev = typeof rawData.score === 'number' ? rawData.score : 0;
        priorityDelta = order === 'min' ? prev - evaluation.score : evaluation.score - prev;
      }

      allCandidateEvals.push({
        pokemon: p,
        subComp,
        score: evaluation.score,
        displayValue: evaluation.displayValue,
        isBetter,
        priorityDelta: isBetter ? Math.abs(priorityDelta) : priorityDelta
      });
    }
  }

  // Sort candidates: improvements first, then by highest improvement/priority delta
  allCandidateEvals.sort((a, b) => {
    if (a.isBetter !== b.isBetter) return a.isBetter ? -1 : 1;
    return b.priorityDelta - a.priorityDelta;
  });

  const assignedPokemonUids = new Set<string>();
  const assignedCategoryIds = new Set<string>();
  const finalAssignments: OptimalAutoFillAssignment[] = [];

  for (const item of allCandidateEvals) {
    if (assignedCategoryIds.has(item.subComp.id)) continue;
    if (assignedPokemonUids.has(item.pokemon.uid)) continue;

    assignedCategoryIds.add(item.subComp.id);
    assignedPokemonUids.add(item.pokemon.uid);

    finalAssignments.push({
      subComp: item.subComp,
      pokemon: item.pokemon,
      score: item.score,
      displayValue: item.displayValue,
      isImprovement: item.isBetter
    });
  }

  return finalAssignments;
}
