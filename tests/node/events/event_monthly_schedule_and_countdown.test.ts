/**
 * tests/node/events/event_monthly_schedule_and_countdown.test.ts
 *
 * Verifies that:
 * 1. Community Day (type: 'monthly', trigger: 'last_sunday') is strictly active on the last Sunday, NOT on the last Saturday.
 * 2. Faction War (type: 'monthly', trigger: 'second_weekend') is active during Week 2 weekend, NOT during the last weekend.
 * 3. getEventCurrentWindow() and getUpcomingEventOccurrences() calculate exact timestamps and countdowns for all monthly triggers.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  getEventCurrentWindow,
  getUpcomingEventOccurrences,
  isEventActiveNow,
  isLastSundayOfMonth,
  isSecondWeekendOfMonth,
  isLastWeekendOfMonth,
  type Event
} from '../../../src/logic/events/eventEngine.ts';
import { GAME_TIMEZONE } from '../../../src/logic/utils/timeUtils.ts';

describe('Monthly Recurring Schedule & Reorganized Community Day', () => {
  const communityDayEvent: Event = {
    id: 'comunidad_mensual',
    name: 'Día de la Comunidad: Growlithe',
    icon: '🌟',
    type: 'passive_bonus',
    active: true,
    manual: false,
    schedule: JSON.stringify({ type: 'monthly', trigger: 'last_sunday', startHour: 0, endHour: 23.99 }),
    config: JSON.stringify({ species: 'growlithe', speciesRateMult: 3.0, speciesShinyMult: 4.0, banner: 'growlithe_full' }),
    description: '¡Gran evento mensual! Spawns x3 y Shiny x4 para el Pokémon destacado del mes (exclusivo domingos de fin de mes).'
  };

  const factionWarEvent: Event = {
    id: 'guerra_facciones_mensual',
    name: 'Campeonato de Guerra de Facciones',
    icon: '⚔️',
    type: 'passive_bonus',
    active: true,
    manual: false,
    schedule: JSON.stringify({ type: 'monthly', trigger: 'second_weekend', startHour: 0, endHour: 23.99 }),
    config: JSON.stringify({ bcMult: 2.0, rivalMult: 2.0, banner: 'war_full' }),
    description: '¡Batallas territoriales épicas! Puntos de facción dobles y 2x Battle Coins durante el 2do fin de semana de cada mes.'
  };

  it('Community Day (last_sunday) is NOT active on the last Saturday of the month', () => {
    // 2026-08-29 is the last Saturday of August 2026
    const saturdayZdt = Temporal.ZonedDateTime.from({
      timeZone: GAME_TIMEZONE,
      year: 2026,
      month: 8,
      day: 29,
      hour: 14,
      minute: 30
    });

    const isSaturdayActive = isEventActiveNow(communityDayEvent, saturdayZdt);
    assert.equal(isSaturdayActive, false, 'Community day should NOT be active on Saturday anymore');

    const window = getEventCurrentWindow(communityDayEvent, saturdayZdt);
    assert.equal(window, null, 'getEventCurrentWindow should be null on Saturday for last_sunday trigger');
  });

  it('Community Day (last_sunday) IS active on the last Sunday of the month and resolves a 24h window', () => {
    // 2026-08-30 is the last Sunday of August 2026
    const sundayZdt = Temporal.ZonedDateTime.from({
      timeZone: GAME_TIMEZONE,
      year: 2026,
      month: 8,
      day: 30,
      hour: 14,
      minute: 30
    });

    const isSundayActive = isEventActiveNow(communityDayEvent, sundayZdt);
    assert.equal(isSundayActive, true, 'Community day should be active on the last Sunday');

    const window = getEventCurrentWindow(communityDayEvent, sundayZdt);
    assert.ok(window !== null, 'getEventCurrentWindow should not be null for active last_sunday event');

    const startZdt = window.start.toZonedDateTimeISO(GAME_TIMEZONE);
    const endZdt = window.end.toZonedDateTimeISO(GAME_TIMEZONE);

    assert.equal(startZdt.day, 30);
    assert.equal(startZdt.hour, 0);
    assert.equal(endZdt.day, 30); // Single-day window: ends on Sunday
    assert.equal(endZdt.hour, 23);
    assert.equal(endZdt.minute, 59);

    const remainingMs = window.end.epochMilliseconds - sundayZdt.toInstant().epochMilliseconds;
    assert.ok(remainingMs > 0, 'Remaining ms should be positive');
    const remainingHours = Math.floor(remainingMs / (1000 * 3600));
    assert.equal(remainingHours, 9, `Expected ~9 hours remaining at Sunday 14:30, got ${remainingHours}`);
  });

  it('Faction War (second_weekend) is active during Week 2 weekend and inactive during Week 4', () => {
    // 2026-08-08 is Week 2 Saturday (days 8-14)
    const week2SaturdayZdt = Temporal.ZonedDateTime.from({
      timeZone: GAME_TIMEZONE,
      year: 2026,
      month: 8,
      day: 8,
      hour: 12,
      minute: 0
    });

    const isWeek2Active = isEventActiveNow(factionWarEvent, week2SaturdayZdt);
    assert.equal(isWeek2Active, true, 'Faction War should be active on Week 2 Saturday');

    const window = getEventCurrentWindow(factionWarEvent, week2SaturdayZdt);
    assert.ok(window !== null, 'getEventCurrentWindow should not be null on Week 2 weekend');
    const endZdt = window.end.toZonedDateTimeISO(GAME_TIMEZONE);
    assert.equal(endZdt.day, 9); // Ends Sunday 23:59 of Week 2

    // 2026-08-29 is Week 4 Saturday (last weekend) -> Should be inactive
    const week4SaturdayZdt = Temporal.ZonedDateTime.from({
      timeZone: GAME_TIMEZONE,
      year: 2026,
      month: 8,
      day: 29,
      hour: 12,
      minute: 0
    });
    const isWeek4Active = isEventActiveNow(factionWarEvent, week4SaturdayZdt);
    assert.equal(isWeek4Active, false, 'Faction War should NOT be active on Week 4 last weekend');
  });

  it('correctly identifies helper predicates for monthly triggers', () => {
    // 2026-08-08 (Week 2 Saturday)
    const w2Sat = Temporal.ZonedDateTime.from({ timeZone: GAME_TIMEZONE, year: 2026, month: 8, day: 8, hour: 12, minute: 0 });
    assert.equal(isSecondWeekendOfMonth(w2Sat), true);
    assert.equal(isLastWeekendOfMonth(w2Sat), false);
    assert.equal(isLastSundayOfMonth(w2Sat), false);

    // 2026-08-29 (Last Saturday)
    const lastSat = Temporal.ZonedDateTime.from({ timeZone: GAME_TIMEZONE, year: 2026, month: 8, day: 29, hour: 12, minute: 0 });
    assert.equal(isLastWeekendOfMonth(lastSat), true);
    assert.equal(isLastSundayOfMonth(lastSat), false);
    assert.equal(isSecondWeekendOfMonth(lastSat), false);

    // 2026-08-30 (Last Sunday)
    const lastSun = Temporal.ZonedDateTime.from({ timeZone: GAME_TIMEZONE, year: 2026, month: 8, day: 30, hour: 12, minute: 0 });
    assert.equal(isLastWeekendOfMonth(lastSun), true);
    assert.equal(isLastSundayOfMonth(lastSun), true);
    assert.equal(isSecondWeekendOfMonth(lastSun), false);
  });

  it('includes upcoming Sunday Community Day on Friday with correct date label (Dom 30/8, not Mañana)', () => {
    // 2026-08-28 is Friday (2 days before Sunday 30/8)
    const fridayInstant = Temporal.ZonedDateTime.from({
      timeZone: GAME_TIMEZONE,
      year: 2026,
      month: 8,
      day: 28,
      hour: 12,
      minute: 0
    }).toInstant();

    const upcoming = getUpcomingEventOccurrences(
      [communityDayEvent],
      fridayInstant,
      7
    );

    assert.equal(upcoming.length, 1);
    const commDayOcc = upcoming[0]!;
    assert.equal(commDayOcc.event.id, 'comunidad_mensual');
    assert.equal(commDayOcc.dateLabel, 'Dom 30/8');
    assert.equal(commDayOcc.dayName, 'Domingo');
    assert.equal(commDayOcc.timeLabel, 'Todo el día');
  });
});
