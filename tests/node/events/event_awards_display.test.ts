import { describe, it, expect } from 'vitest';
import { getEventDisplayName } from '@/logic/events/eventSchedules';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import type { Event } from '@/logic/events/eventEngine';

describe('Event Pending Awards Display Name with Historical Timestamps', () => {
  it('should resolve the correct rotation event name when an historical awarded_at date is provided', () => {
    const event: Event = {
      id: 'competition_fishing',
      name: 'Torneo de Pesca',
      description: 'Torneo de Pesca',
      active: true,
      config: {
        rotationTheme: 'weekly_4',
        weeklyRotations: {
          '1': { species: 'magikarp', title: 'Torneo Magikarp & Gyarados', banner: 'banner1' },
          '2': { species: 'shellder', title: 'Torneo de Pesca Exótica', banner: 'banner2' },
          '3': { species: 'horsea', title: 'Torneo Dragones del Mar', banner: 'banner3' },
          '4': { species: 'lapras', title: 'Torneo Mareas Heladas', banner: 'banner4' }
        }
      }
    };

    // Week 1 timestamp: 2026-05-18T10:00:00Z (Magikarp rotation, day of year week % 4 + 1 = 1)
    // In UTC, day 138 of 2026: Math.floor((138-1)/7) % 4 + 1
    const week1Zdt = Temporal.Instant.from('2026-01-05T10:00:00Z').toZonedDateTimeISO(GAME_TIMEZONE); // week 1
    const displayNameWeek1 = getEventDisplayName(event, week1Zdt);
    expect(displayNameWeek1).toBe('Torneo Magikarp & Gyarados');

    // Week 2 timestamp: 2026-01-12T10:00:00Z
    const week2Zdt = Temporal.Instant.from('2026-01-12T10:00:00Z').toZonedDateTimeISO(GAME_TIMEZONE); // week 2
    const displayNameWeek2 = getEventDisplayName(event, week2Zdt);
    expect(displayNameWeek2).toBe('Torneo de Pesca Exótica');
  });
});
