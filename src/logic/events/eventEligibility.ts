/**
 * src/logic/events/eventEligibility.ts
 *
 * Event and Sub-Competition Eligibility Validation.
 * Validates species constraints, capture timeframes, and filter criteria.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import { logger } from '@/logic/utils/logger.ts';
import { normalizeZonedDateTime } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation, getEventCurrentWindow } from './eventSchedules.ts';
import type { Event, EventConfig } from './eventEngine.ts';
import type { SubCompetitionConfig } from './eventCompetitions.ts';

/**
 * Validates if a Pokémon is eligible to be entered/presented into an event based on its species and capture date.
 */
export function isPokemonEligibleForEvent(
  event: Event,
  pokemon: Pokemon,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): { eligible: boolean; reason?: string } {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon inexistente' };
  }

  const cfg = safeParse(event.config) as EventConfig;

  // 1. Check species if constrained ('*' means open to any species)
  const effectiveSpecies = (() => {
    if (cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations) {
      const zdt = normalizeZonedDateTime(date);
      const rotation = resolveWeeklyRotation(cfg, zdt);
      return rotation?.species ?? cfg.species;
    }
    return cfg.species;
  })();

  if (effectiveSpecies && effectiveSpecies !== '*') {
    const allowedSpecies = effectiveSpecies.split(',').map(s => s.trim().toLowerCase());
    const pokeSpecies = pokemon.id;
    if (!allowedSpecies.includes(pokeSpecies)) {
      return { eligible: false, reason: `Especie no permitida. Requiere: ${effectiveSpecies}` };
    }
  }

  // 2. Check capture date if constrained
  if (cfg.requireCaughtDuringEvent) {
    const rawObtainedAt = pokemon.obtainedAt;
    if (typeof rawObtainedAt !== 'number' || isNaN(rawObtainedAt) || rawObtainedAt <= 0) {
      return { eligible: false, reason: 'El Pokémon no tiene fecha de captura registrada' };
    }

    let startMs: number | null = null;
    let endMs: number | null = null;

    if (cfg.catchStartDate && cfg.catchEndDate) {
      try {
        startMs = Temporal.Instant.from(cfg.catchStartDate).epochMilliseconds;
        endMs = Temporal.Instant.from(cfg.catchEndDate).epochMilliseconds;
      } catch (e) {
        logger.warn('EventEngine', 'Invalid catchStartDate/catchEndDate format', e);
      }
    }

    if (startMs === null || endMs === null) {
      const window = getEventCurrentWindow(event, date);
      if (window) {
        startMs = window.start.epochMilliseconds;
        endMs = window.end.epochMilliseconds;
      }
    }

    if (startMs !== null && endMs !== null) {
      if (rawObtainedAt < startMs || rawObtainedAt > endMs) {
        return { eligible: false, reason: 'El Pokémon no fue capturado dentro del periodo del evento' };
      }
    } else {
      return { eligible: false, reason: 'El evento no tiene una franja horaria activa válida' };
    }
  }

  return { eligible: true };
}

/**
 * Validates if a Pokémon meets both global event requirements and specific sub-competition filters.
 */
export function isPokemonEligibleForSubCompetition(
  event: Event,
  subComp: SubCompetitionConfig,
  pokemon: Pokemon,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): { eligible: boolean; reason?: string } {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon inexistente' };
  }

  // 1. Target species check for species-scoped categories
  if (subComp.targetSpecies) {
    const requiredSpecies = subComp.targetSpecies;
    if (pokemon.id !== requiredSpecies) {
      return { eligible: false, reason: `Esta categoría está reservada exclusivamente para ${requiredSpecies}` };
    }
  }

  // 2. Global event eligibility (species whitelist, catch period)
  const globalCheck = isPokemonEligibleForEvent(event, pokemon, date);
  if (!globalCheck.eligible) {
    return globalCheck;
  }

  // 3. Sub-competition specific filters (default to unrestricted 'any')
  const filters = subComp.filters;
  if (!filters) {
    return { eligible: true };
  }

  // Nature filter
  if (filters.natures && filters.natures.length > 0) {
    const pokeNature = pokemon.nature;
    if (!pokeNature || !filters.natures.includes(pokeNature)) {
      return { eligible: false, reason: `Naturaleza no permitida. Requiere: ${filters.natures.join(', ')}` };
    }
  }

  // Ability filter
  if (filters.abilities && filters.abilities.length > 0) {
    const pokeAbility = pokemon.ability;
    if (!pokeAbility || !filters.abilities.includes(pokeAbility)) {
      return { eligible: false, reason: `Habilidad no permitida. Requiere: ${filters.abilities.join(', ')}` };
    }
  }

  // Gender filter
  if (filters.gender !== undefined && filters.gender !== null) {
    if (pokemon.gender !== filters.gender) {
      return { eligible: false, reason: `Género no coincide. Requiere: ${filters.gender === 'm' ? 'Macho' : filters.gender === 'f' ? 'Hembra' : 'Sin género'}` };
    }
  }

  // Level filters
  if (filters.minLevel !== undefined && (pokemon.level || 1) < filters.minLevel) {
    return { eligible: false, reason: `Nivel insuficiente. Mínimo requerido: Nv. ${filters.minLevel}` };
  }
  if (filters.maxLevel !== undefined && (pokemon.level || 1) > filters.maxLevel) {
    return { eligible: false, reason: `Nivel excedido. Máximo permitido: Nv. ${filters.maxLevel}` };
  }

  // Shiny only filter
  if (filters.isShinyOnly && !pokemon.isShiny) {
    return { eligible: false, reason: 'Solo se admiten Pokémon Variocolor (Shiny)' };
  }

  return { eligible: true };
}

/**
 * Pre-filters a list of candidate Pokémon, returning only those eligible for the given sub-competition.
 */
export function getEligiblePokemonForSubCompetition(
  event: Event,
  subComp: SubCompetitionConfig,
  pokemonList: (Pokemon | null)[],
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): Pokemon[] {
  return pokemonList
    .filter((p): p is Pokemon => p !== null && p !== undefined)
    .filter(p => isPokemonEligibleForSubCompetition(event, subComp, p, date).eligible);
}

/**
 * Checks whether a given Pokémon UID is already registered in another sub-competition of the same event.
 */
export function isPokemonEnrolledInOtherSubCompetition(
  userEntries: Record<string, { event_id?: string; category_id?: string; pokemon_uid?: string } | undefined>,
  eventId: string,
  categoryId: string,
  pokemonUid: string
): boolean {
  if (!userEntries || !pokemonUid) return false;
  for (const entry of Object.values(userEntries)) {
    if (!entry) continue;
    if (entry.event_id === eventId && entry.pokemon_uid === pokemonUid) {
      const entryCategory = entry.category_id || 'ivs';
      if (entryCategory !== categoryId) {
        return true;
      }
    }
  }
  return false;
}
