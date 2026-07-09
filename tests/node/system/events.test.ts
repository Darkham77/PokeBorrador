/**
 * tests/node/events.test.ts
 * 
 * VITEST (vite-node) — node environment
 * 
 * Migrated from tests/unit/events.spec.ts
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';


// Use relative path since Node native doesn't resolve aliases by default without loaders
import { 
  isEventActiveNow, 
  getGlobalMultipliers, 
  getSpeciesBoosts, 
  getArgDateString,
  type Event
} from '../../../src/logic/events/eventEngine.ts';

describe('Event Engine Logic (Native)', () => {
  it('correctly identifies manual events as active', () => {
    const event = { active: true, manual: true };
    assert.strictEqual(isEventActiveNow(event as unknown as Event), true);
  });

  it('identifies inactive events as false', () => {
    const event = { active: false, manual: true };
    assert.strictEqual(isEventActiveNow(event as unknown as Event), false);
  });

  it('filters by absolute date range', () => {
    const event = { 
      active: true, 
      start_at: '2026-04-10T00:00:00Z', 
      end_at: '2026-04-20T00:00:00Z' 
    };
    const internalDate = Temporal.Instant.from('2026-04-15T12:00:00Z');
    const outsideDate = Temporal.Instant.from('2026-04-25T12:00:00Z');

    assert.strictEqual(isEventActiveNow(event as unknown as Event, internalDate), true);
    assert.strictEqual(isEventActiveNow(event as unknown as Event, outsideDate), false);
  });

  it('aggregates multipliers correctly', () => {
    const activeEvents = [
      { config: { expMult: 2, moneyMult: 1.5 } },
      { config: { expMult: 1.5, shinyMult: 2 } }
    ];
    const mults = getGlobalMultipliers(activeEvents as unknown as Event[]);
    
    assert.strictEqual(mults.exp, 3); // 2 * 1.5
    assert.strictEqual(mults.money, 1.5);
    assert.strictEqual(mults.shiny, 2);
    assert.strictEqual(mults.bc, 1); // Default
  });

  it('calculates species specific boosts', () => {
    const activeEvents = [
      { config: { species: 'pikachu, raichu', speciesRateMult: 5, speciesShinyMult: 2 } },
      { config: { species: 'bulbasaur', speciesRateMult: 10 } }
    ];

    const pikaBoost = getSpeciesBoosts(activeEvents as unknown as Event[], 'pikachu');
    const bulbBoost = getSpeciesBoosts(activeEvents as unknown as Event[], 'bulbasaur');
    const charmBoost = getSpeciesBoosts(activeEvents as unknown as Event[], 'charmander');

    assert.strictEqual(pikaBoost.rate, 5);
    assert.strictEqual(pikaBoost.shiny, 2);
    assert.strictEqual(bulbBoost.rate, 10);
    assert.strictEqual(charmBoost.rate, 1);
  });

  it('handles robust parsing of stringified JSON config/schedule', () => {
    const event = {
      active: true,
      schedule: JSON.stringify({ type: 'weekly', days: [1, 2, 3, 4, 5], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ expMult: 5 })
    };
    
    // Check multiplier parsing
    const mults = getGlobalMultipliers([event] as unknown as Event[]);
    assert.strictEqual(mults.exp, 5);

    // Check schedule parsing (using a Monday as test date)
    const monday = Temporal.Instant.from('2026-04-20T12:00:00Z'); // Monday
    assert.strictEqual(isEventActiveNow(event as unknown as Event, monday), true);
  });

  it('correctly handles weekly schedules crossover (midnight)', () => {
    const event = {
      active: true,
      schedule: {
        type: 'weekly',
        days: [1], // Monday
        startHour: 22,
        endHour: 2 // Ends at 02:00 next day (Tuesday)
      }
    };

    const mondayNight = Temporal.Instant.from('2026-04-21T01:00:00Z');
    const tuesdayMorning = Temporal.Instant.from('2026-04-21T04:00:00Z');
    const mondayEvening = Temporal.Instant.from('2026-04-21T00:00:00Z');

    assert.strictEqual(isEventActiveNow(event as unknown as Event, mondayNight), true);
    assert.strictEqual(isEventActiveNow(event as unknown as Event, tuesdayMorning), true);
    assert.strictEqual(isEventActiveNow(event as unknown as Event, mondayEvening), false);
  });

  it('formats argument date strings correctly', () => {
    const date = Temporal.Instant.from('2026-05-09T12:00:00Z');
    const zdt = Temporal.ZonedDateTime.from('2026-05-10T12:00:00[America/Argentina/Buenos_Aires]');
    
    assert.strictEqual(getArgDateString(date), '2026-05-09');
    assert.strictEqual(getArgDateString(zdt), '2026-05-10');
    assert.match(getArgDateString(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
