/**
 * src/composables/events/eventDetailBonusesHelper.ts
 *
 * Pure helper utilities for extracting event bonus pills,
 * minigame bonuses, species resolutions, and schedule text formatting.
 */

import { normalizeZonedDateTime } from '@/logic/utils/timeUtils';
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ResolvedSubCompetition } from '@/logic/events/eventEngine';
import type { Prize, ExtendedEventConfig, BonusItem, Schedule } from './useEventDetailBonuses.ts';

const ALL_DAY_HOURS = 24;
const ALL_DAY_THRESHOLD = 23.9;
const WEEK_DAYS_COUNT = 7;
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

interface CoreBonusDef {
  key: keyof ExtendedEventConfig;
  label: string;
  color: string;
}

const CORE_BONUS_DEFS: readonly CoreBonusDef[] = [
  { key: 'expMult', label: '⭐ EXP ganada en cada combate', color: 'rgba(74, 222, 128, 1)' },
  { key: 'moneyMult', label: '💰 Dinero ganado por victoria', color: 'rgba(250, 204, 21, 1)' },
  { key: 'bcMult', label: '🪙 Battle Coins por victoria en combate', color: 'rgba(96, 165, 250, 1)' },
  { key: 'catchRateMult', label: '🔴 Mayor probabilidad de captura con cualquier Pokéball', color: 'rgba(244, 114, 182, 1)' },
  { key: 'shinyMult', label: '✨ Más chances de encontrar Pokémon Variocolor (Shiny)', color: 'rgba(244, 114, 182, 1)' },
  { key: 'eggShinyMult', label: '🥚 Más chances de que los Huevos eclosionen en Shiny', color: 'rgba(244, 114, 182, 1)' },
  { key: 'hatchMult', label: '🏃 Los Huevos eclosionan más rápido (menos pasos)', color: 'rgba(56, 189, 248, 1)' }
];

export function buildCoreBonuses(c: ExtendedEventConfig): BonusItem[] {
  const bonuses: BonusItem[] = [];
  for (const def of CORE_BONUS_DEFS) {
    const val = c[def.key];
    if (typeof val === 'number' && val > 1) {
      bonuses.push({ label: def.label, color: def.color, value: `x${val}` });
    }
  }
  return bonuses;
}

export function buildSpeciesBonuses(c: ExtendedEventConfig, spNames: string | null): BonusItem[] {
  const bonuses: BonusItem[] = [];
  if (c.speciesShinyMult && c.speciesShinyMult > 1) {
    const label = spNames
      ? `✨ Más chances de encontrar ${spNames} Variocolor (Shiny)`
      : '✨ Más chances de encontrar Pokémon del Evento Variocolor (Shiny)';
    bonuses.push({ label, color: 'rgba(244, 114, 182, 1)', value: `x${c.speciesShinyMult}` });
  }
  if (c.speciesRateMult && c.speciesRateMult > 1) {
    const label = spNames
      ? `🎯 ${spNames} aparece con mayor frecuencia en el mundo`
      : '🎯 Pokémon del Evento aparecen con mayor frecuencia en el mundo';
    bonuses.push({ label, color: 'rgba(96, 165, 250, 1)', value: `x${c.speciesRateMult}` });
  }
  return bonuses;
}

interface ActivityBonusDef {
  key: keyof ExtendedEventConfig;
  minigameKey: string;
  label: string;
  color: string;
}

const ACTIVITY_BONUS_DEFS: readonly ActivityBonusDef[] = [
  { key: 'fishingMult', minigameKey: 'fishing', label: '🎣 Pesca: Mayor frecuencia de encuentros y capturas', color: 'rgba(56, 189, 248, 1)' },
  { key: 'archaeologyMult', minigameKey: 'archaeology', label: '⛏️ Arqueología: Mayor probabilidad de fósiles, gemas y tesoros', color: 'rgba(251, 146, 60, 1)' },
  { key: 'bugCatchingMult', minigameKey: 'bug_catching', label: '🦗 Caza de Bichos: Mayor aparición de Pokémon insecto', color: 'rgba(163, 230, 53, 1)' }
];

export function buildActivityBonuses(c: ExtendedEventConfig): BonusItem[] {
  const bonuses: BonusItem[] = [];
  const mb = c.minigameBuffs || {};
  for (const def of ACTIVITY_BONUS_DEFS) {
    const val = c[def.key];
    if (typeof val === 'number' && val > 1 && !mb[def.minigameKey]) {
      bonuses.push({ label: def.label, color: def.color, value: `x${val}` });
    }
  }
  return bonuses;
}

const MINIGAME_DISPLAY_NAMES: Record<string, string> = {
  fishing: '🎣 Pesca',
  archaeology: '⛏️ Arqueología',
  bug_catching: '🦗 Caza de Bichos',
  safari: '🧭 Zona Safari'
};

interface BuffTypeDef {
  key: string;
  template: string;
  color: string;
}

const MINIGAME_BUFF_DEFS: readonly BuffTypeDef[] = [
  { key: 'encounterRateMult', template: 'Más Pokémon aparecen por sesión', color: 'rgba(56, 189, 248, 1)' },
  { key: 'successRateMult', template: 'Mayor probabilidad de éxito por intento', color: 'rgba(74, 222, 128, 1)' },
  { key: 'rareDropMult', template: 'Más objetos raros, gemas y tesoros', color: 'rgba(250, 204, 21, 1)' },
  { key: 'shinyMult', template: 'Mayor probabilidad de hallar Pokémon Shiny', color: 'rgba(244, 114, 182, 1)' },
  { key: 'expMult', template: 'Más EXP ganada por actividad', color: 'rgba(168, 85, 247, 1)' },
  { key: 'scoreMult', template: 'Puntaje más alto en la clasificación', color: 'rgba(234, 179, 8, 1)' }
];

function extractMinigameBuffItems(mName: string, buffs: Record<string, number | undefined>): BonusItem[] {
  const items: BonusItem[] = [];
  for (const def of MINIGAME_BUFF_DEFS) {
    const val = buffs[def.key];
    if (typeof val === 'number' && val > 1) {
      items.push({ label: `${mName}: ${def.template}`, color: def.color, value: `x${val}` });
    }
  }
  return items;
}

export function buildMinigameBuffBonuses(minigameBuffs: ExtendedEventConfig['minigameBuffs']): BonusItem[] {
  if (!minigameBuffs || typeof minigameBuffs !== 'object') return [];
  const bonuses: BonusItem[] = [];

  for (const [mId, buffs] of Object.entries(minigameBuffs)) {
    if (mId === 'casino' || !buffs) continue;
    const mName = MINIGAME_DISPLAY_NAMES[mId] || `🎮 ${mId.toUpperCase()}`;
    bonuses.push(...extractMinigameBuffItems(mName, buffs as Record<string, number | undefined>)); // open-record: Generic key-value data dictionary container
  }
  return bonuses;
}

function formatScheduleHour(hr: number): string {
  const h = Math.floor(hr);
  const m = Math.round((hr % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveScheduleHoursText(startHour?: number, endHour?: number): string {
  if (startHour === undefined || endHour === undefined) return '';
  const isAllDay = startHour === 0 && (endHour === ALL_DAY_HOURS || endHour >= ALL_DAY_THRESHOLD);
  return isAllDay
    ? ' · Todo el día (ARG)'
    : ` · ${formatScheduleHour(startHour)} – ${formatScheduleHour(endHour)} hs (ARG)`;
}

export function formatWeeklySchedule(sched: Schedule): string | null {
  if (sched.type !== 'weekly' || !sched.days) return null;
  const days = sched.days.length === WEEK_DAYS_COUNT
    ? 'Todos los días'
    : sched.days.map((d: number) => DAY_NAMES[d]).join(', ');
  const hours = resolveScheduleHoursText(sched.startHour, sched.endHour);
  return `${days}${hours}`;
}

function formatTwoDigits(val: number): string {
  return String(val).padStart(2, '0');
}

function formatZdtTime(zdt: Temporal.ZonedDateTime): string {
  return `${formatTwoDigits(zdt.hour)}:${formatTwoDigits(zdt.minute)}`;
}

function isZdtAllDay(startZdt: Temporal.ZonedDateTime, endZdt: Temporal.ZonedDateTime): boolean {
  const isStart = startZdt.hour === 0 && startZdt.minute === 0;
  const isEnd = (endZdt.hour === 23 && endZdt.minute >= 59) || (endZdt.hour === 0 && endZdt.minute === 0);
  return isStart && isEnd;
}

export function formatDateRangeSchedule(startAt?: string, endAt?: string): string | null {
  if (!startAt || !endAt) return null;
  try {
    const startZdt = normalizeZonedDateTime(Temporal.Instant.from(startAt));
    const endZdt = normalizeZonedDateTime(Temporal.Instant.from(endAt));
    const isSameDay = startZdt.year === endZdt.year && startZdt.month === endZdt.month && startZdt.day === endZdt.day;
    const isAllDay = isZdtAllDay(startZdt, endZdt);

    if (isSameDay) {
      const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatZdtTime(startZdt)} – ${formatZdtTime(endZdt)} hs (ARG)`;
      return `${startZdt.day}/${startZdt.month}/${startZdt.year}${timePart}`;
    }
    const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatZdtTime(startZdt)} al ${formatZdtTime(endZdt)} hs (ARG)`;
    return `Del ${startZdt.day}/${startZdt.month} al ${endZdt.day}/${endZdt.month}/${endZdt.year}${timePart}`;
  } catch {
    return null;
  }
}

export function formatEndedAtSchedule(endedAt?: string): string | null {
  if (!endedAt) return null;
  try {
    const instant = Temporal.Instant.from(endedAt);
    const zdt = normalizeZonedDateTime(instant);
    const day = formatTwoDigits(zdt.day);
    const month = formatTwoDigits(zdt.month);
    const year = String(zdt.year);
    const hour = formatTwoDigits(zdt.hour);
    const minute = formatTwoDigits(zdt.minute);
    return `🏁 Edición finalizada el ${day}/${month}/${year} a las ${hour}:${minute} hs (ARG)`;
  } catch {
    return null;
  }
}

function extractSpeciesFromPrize(prize: unknown): string | null {
  if (!prize || typeof prize !== 'object') return null;
  const candidate = (prize as Record<string, unknown>).species; // open-record: Generic key-value data dictionary container
  return typeof candidate === 'string' ? candidate : null;
}

function collectPrizeSpecies(prizes?: { first?: Prize; second?: Prize; third?: Prize } | null): string[] { // domain-ok: Raw unvalidated prize species strings before domain validation
  if (!prizes) return [];
  const species: string[] = []; // domain-ok: Raw unvalidated prize species string array before isPokemonSpeciesId filtering
  const s1 = extractSpeciesFromPrize(prizes.first);
  if (s1) species.push(s1);
  const s2 = extractSpeciesFromPrize(prizes.second);
  if (s2) species.push(s2);
  const s3 = extractSpeciesFromPrize(prizes.third);
  if (s3) species.push(s3);
  return species;
}

export function resolveInvolvedSpecies(
  effectiveSpeciesStr: string | null,
  prizes: { first?: Prize; second?: Prize; third?: Prize } | null,
  subCompetitions: readonly ResolvedSubCompetition[]
): PokemonSpeciesId[] {
  const result: PokemonSpeciesId[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const id = raw.trim().toLowerCase();
    if (isPokemonSpeciesId(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  };

  if (effectiveSpeciesStr) {
    effectiveSpeciesStr.split(',').forEach(add);
  }

  collectPrizeSpecies(prizes).forEach(add);

  for (const sub of subCompetitions) {
    const subPrizes = (sub.prizes && (sub.prizes.first || sub.prizes.second || sub.prizes.third))
      ? (sub.prizes as { first?: Prize; second?: Prize; third?: Prize })
      : prizes;
    collectPrizeSpecies(subPrizes).forEach(add);
  }

  return result;
}
