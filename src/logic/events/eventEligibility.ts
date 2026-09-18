/**
 * src/logic/events/eventEligibility.ts
 *
 * Event and Sub-Competition Eligibility Validation.
 * Validates species constraints, capture timeframes, and filter criteria.
 */

import type { Pokemon, PokemonGender } from '@/types/pokemon/pokemon';
import { logger } from '@/logic/utils/logger.ts';
import { normalizeZonedDateTime } from '@/logic/utils/timeUtils.ts';
import { safeParse, resolveWeeklyRotation, getEventCurrentWindow } from './eventSchedules.ts';
import type { Event, EventConfig } from './eventEngine.ts';
import type { SubCompetitionConfig } from './eventCompetitions.ts';

/**
 * Validates if a Pokémon is eligible to be entered/presented into an event based on its species and capture date.
 */
function resolveEffectiveSpecies(
  cfg: EventConfig,
  date: Temporal.ZonedDateTime | Temporal.Instant
): string | undefined {
  if (cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations) {
    const zdt = normalizeZonedDateTime(date);
    const rotation = resolveWeeklyRotation(cfg, zdt);
    return rotation?.species ?? cfg.species;
  }
  return cfg.species;
}

function checkSpeciesEligibility(
  effectiveSpecies: string | undefined,
  pokemonSpeciesKey: string
): { eligible: boolean; reason?: string } {
  if (!effectiveSpecies || effectiveSpecies === '*') {
    return { eligible: true };
  }
  const allowedSpecies = effectiveSpecies.split(',').map(s => s.trim().toLowerCase());
  if (!allowedSpecies.includes(pokemonSpeciesKey)) {
    return { eligible: false, reason: `Especie no permitida. Requiere: ${effectiveSpecies}` };
  }
  return { eligible: true };
}

function resolveEventTimeframe(
  event: Event,
  cfg: EventConfig,
  date: Temporal.ZonedDateTime | Temporal.Instant
): { startMs: number | null; endMs: number | null } {
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

  return { startMs, endMs };
}

function checkCaptureDateEligibility(
  event: Event,
  cfg: EventConfig,
  pokemon: Pokemon,
  date: Temporal.ZonedDateTime | Temporal.Instant
): { eligible: boolean; reason?: string } {
  if (!cfg.requireCaughtDuringEvent) {
    return { eligible: true };
  }

  const rawObtainedAt = pokemon.obtainedAt;
  if (typeof rawObtainedAt !== 'number' || isNaN(rawObtainedAt) || rawObtainedAt <= 0) {
    return { eligible: false, reason: 'El Pokémon no tiene fecha de captura registrada' };
  }

  const { startMs, endMs } = resolveEventTimeframe(event, cfg, date);
  if (startMs !== null && endMs !== null) {
    if (rawObtainedAt < startMs || rawObtainedAt > endMs) {
      return { eligible: false, reason: 'El Pokémon no fue capturado dentro del periodo del evento' };
    }
    return { eligible: true };
  }

  return { eligible: false, reason: 'El evento no tiene una franja horaria activa válida' };
}

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
  const effectiveSpecies = resolveEffectiveSpecies(cfg, date);
  const speciesCheck = checkSpeciesEligibility(effectiveSpecies, pokemon.id);
  if (!speciesCheck.eligible) {
    return speciesCheck;
  }

  // 2. Check capture date if constrained
  return checkCaptureDateEligibility(event, cfg, pokemon, date);
}

function checkNatureFilter(allowedNatures: string[] | undefined, pokeNature?: string): { eligible: boolean; reason?: string } {
  if (allowedNatures && allowedNatures.length > 0) {
    if (!pokeNature || !allowedNatures.includes(pokeNature)) {
      return { eligible: false, reason: `Naturaleza no permitida. Requiere: ${allowedNatures.join(', ')}` };
    }
  }
  return { eligible: true };
}

function checkAbilityFilter(allowedAbilities: string[] | undefined, pokeAbility?: string): { eligible: boolean; reason?: string } {
  if (allowedAbilities && allowedAbilities.length > 0) {
    if (!pokeAbility || !allowedAbilities.includes(pokeAbility)) {
      return { eligible: false, reason: `Habilidad no permitida. Requiere: ${allowedAbilities.join(', ')}` };
    }
  }
  return { eligible: true };
}

function checkGenderFilter(requiredGender: string | undefined | null, pokeGender?: PokemonGender): { eligible: boolean; reason?: string } {
  if (requiredGender !== undefined && requiredGender !== null) {
    if (pokeGender !== requiredGender) {
      return { eligible: false, reason: `Género no coincide. Requiere: ${requiredGender === 'm' ? 'Macho' : requiredGender === 'f' ? 'Hembra' : 'Sin género'}` };
    }
  }
  return { eligible: true };
}

function checkLevelFilter(minLevel?: number, maxLevel?: number, pokeLevel?: number): { eligible: boolean; reason?: string } {
  const currentLevel = pokeLevel || 1;
  if (minLevel !== undefined && currentLevel < minLevel) {
    return { eligible: false, reason: `Nivel insuficiente. Mínimo requerido: Nv. ${minLevel}` };
  }
  if (maxLevel !== undefined && currentLevel > maxLevel) {
    return { eligible: false, reason: `Nivel excedido. Máximo permitido: Nv. ${maxLevel}` };
  }
  return { eligible: true };
}

function checkSubCompetitionFilters(
  filters: SubCompetitionConfig['filters'],
  pokemon: Pokemon
): { eligible: boolean; reason?: string } {
  if (!filters) return { eligible: true };

  const natureCheck = checkNatureFilter(filters.natures, pokemon.nature);
  if (!natureCheck.eligible) return natureCheck;

  const abilityCheck = checkAbilityFilter(filters.abilities, pokemon.ability);
  if (!abilityCheck.eligible) return abilityCheck;

  const genderCheck = checkGenderFilter(filters.gender, pokemon.gender);
  if (!genderCheck.eligible) return genderCheck;

  const levelCheck = checkLevelFilter(filters.minLevel, filters.maxLevel, pokemon.level);
  if (!levelCheck.eligible) return levelCheck;

  if (filters.isShinyOnly && !pokemon.isShiny) {
    return { eligible: false, reason: 'Solo se admiten Pokémon Variocolor (Shiny)' };
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
  if (subComp.targetSpecies && pokemon.id !== subComp.targetSpecies) {
    return { eligible: false, reason: `Esta categoría está reservada exclusivamente para ${subComp.targetSpecies}` };
  }

  // 2. Global event eligibility (species whitelist, catch period)
  const globalCheck = isPokemonEligibleForEvent(event, pokemon, date);
  if (!globalCheck.eligible) {
    return globalCheck;
  }

  // 3. Sub-competition specific filters (default to unrestricted 'any')
  return checkSubCompetitionFilters(subComp.filters, pokemon);
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
