import type { Event as GameEvent, EventConfig, UpcomingEventOccurrence } from '@/logic/events/eventEngine';
import { getEventCurrentWindow } from '@/logic/events/eventEngine';
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { SECONDS_PER_MINUTE, SECONDS_PER_HOUR } from '@/logic/constants/gameplay';

const MILLIS_PER_SECOND = 1000 as const;

export const EVENT_BANNER_FALLBACKS: Record<string, string> = {
  dia_pesca: 'dia_pesca_full',
  torneo_pesca: 'pesca_exotica_full',
  dia_crianza: 'huevos_full',
  dia_naturaleza: 'safari_park_full',
  torneo_caza: 'caza_bichos_full',
  fiebre_minera: 'arqueologia_fosiles_full',
  doble_exp: 'doble_exp_full',
  gran_concurso_sabado: 'gran_concurso_sabado_full',
  dia_safari_suerte: 'safari_suerte_full',
  comunidad_mensual: 'growlithe_full',
  guerra_facciones_mensual: 'war_full',
  fiebre_oro: 'rival_full'
};

export function parseEventConfig(rawConfig: unknown): EventConfig {
  if (typeof rawConfig === 'string') {
    try {
      return JSON.parse(rawConfig) as EventConfig;
    } catch {
      return {};
    }
  }
  if (rawConfig && typeof rawConfig === 'object') {
    return rawConfig as EventConfig;
  }
  return {};
}

function formatInstantDuration(isoTime: string, nowMs: number): string {
  if (!isoTime) return 'Indefinido';
  try {
    const target = Temporal.Instant.from(isoTime);
    const current = Temporal.Instant.fromEpochMilliseconds(nowMs);
    if (Temporal.Instant.compare(target, current) <= 0) return 'Terminando...';

    const duration = target.since(current, { largestUnit: 'minute' });
    const min = Math.max(0, Math.floor(duration.minutes));
    const sec = Math.max(0, Math.floor(Math.abs(duration.seconds) % SECONDS_PER_MINUTE));
    return `${min}m ${sec}s`;
  } catch {
    return 'Error';
  }
}

export function formatEventRemainingTime(
  event: GameEvent,
  occurrence: UpcomingEventOccurrence | undefined,
  nowMs: number
): string {
  if (occurrence) {
    return occurrence.startsInLabel;
  }
  const currentInstant = Temporal.Instant.fromEpochMilliseconds(nowMs);
  const window = getEventCurrentWindow(event, currentInstant);
  if (window) {
    if (Temporal.Instant.compare(window.end, currentInstant) <= 0) return 'Terminando...';
    const diffMs = window.end.epochMilliseconds - nowMs;
    const totalSecs = Math.max(0, Math.floor(diffMs / MILLIS_PER_SECOND));
    const hours = Math.floor(totalSecs / SECONDS_PER_HOUR);
    const mins = Math.floor((totalSecs % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const secs = totalSecs % SECONDS_PER_MINUTE;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }
  if (event.end_at) {
    return formatInstantDuration(event.end_at, nowMs);
  }
  if (event.manual) {
    return 'Manual (Activo)';
  }
  return 'Indefinido';
}

export function extractCardSpeciesList(rotationSpecies?: string, configSpecies?: string): PokemonSpeciesId[] {
  const raw = rotationSpecies ?? configSpecies;
  if (raw && raw !== '*') {
    const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(isPokemonSpeciesId);
    if (list.length > 0) return list;
  }
  return [];
}

export function resolveEventBannerKey(eventId: string, rotationBanner?: string, configBanner?: string): string {
  if (rotationBanner) return rotationBanner;
  if (configBanner) return configBanner;
  return EVENT_BANNER_FALLBACKS[eventId] || '';
}

export function resolveCardElementId(prefix?: string, eventId?: string, startInstantMs?: number): string {
  const basePrefix = prefix || '';
  const idStr = eventId || '';
  const timeSuffix = startInstantMs ? `-${startInstantMs}` : '';
  return `${basePrefix}event-card-${idStr}${timeSuffix}`;
}

export function resolveEventCardClasses(hasBanner: boolean, isUpcoming: boolean): Record<string, boolean> {
  return {
    'has-banner': hasBanner,
    'is-upcoming-card': isUpcoming,
    'is-active-card': !isUpcoming
  };
}
