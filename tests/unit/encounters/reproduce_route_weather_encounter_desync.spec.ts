import { describe, it, expect } from 'vitest';
import { getRouteWeather } from '@/logic/weather/weatherUtils';
import { requireWeatherSeasonId } from '@/data/world/weather-tables';
import { getDayCycle, getSeason } from '@/logic/utils/timeUtils';
import { getFinalGroundRates } from '@/logic/encounters/encounters';
import { FIRE_RED_MAPS } from '@/data/world/maps';

describe('Exact Date Deterministic Weather Test: 13/9/2026 18:20', () => {
  // 13/9/2026 18:20 in America/Argentina/Buenos_Aires (-03:00)
  const zdt = Temporal.ZonedDateTime.from('2026-09-13T18:20:00-03:00[America/Argentina/Buenos_Aires]');
  const instant = zdt.toInstant();
  const epochMs = Number(instant.epochMilliseconds);
  const epochHour = Math.floor(epochMs / 3600000);
  const cycle = getDayCycle(instant);
  const season = getSeason(instant);

  it('verifies cycle, season, and route1 weather at 13/9/2026 18:20', () => {
    console.log('EpochHour:', epochHour);
    console.log('Cycle:', cycle);
    console.log('Season:', season);

    const weatherRoute1 = getRouteWeather(
      'route1',
      requireWeatherSeasonId(season.id),
      epochHour,
      cycle
    );

    console.log('Weather Route 1:', weatherRoute1);
    // As shown in the user screenshot, Weather is VIENTO (wind) and Cycle is OCASO (dusk):
    expect(cycle).toBe('dusk');
    expect(weatherRoute1).toBe('wind');

    // In wind weather, route 1 encounter pool:
    const route1 = FIRE_RED_MAPS.find(m => m.id === 'route1')!;
    const { pool, rates } = getFinalGroundRates(route1, cycle, weatherRoute1, []);
    console.log('Encounter Pool in Wind:', pool);
    console.log('Rates in Wind:', rates);

    expect(pool).toContain('pidgeotto');
    expect(pool).toContain('butterfree');
    expect(pool).toContain('rattata');
    expect(pool).toContain('pidgey');
    // GASTLY MUST NOT BE IN THE POOL:
    expect(pool).not.toContain('gastly');
  });

  it('checks which route actually has fog at this exact date and hour', () => {
    const allRoutes = FIRE_RED_MAPS.map(m => m.id);
    const routesWithFog: string[] = [];

    for (const rId of allRoutes) {
      try {
        const w = getRouteWeather(rId as any, requireWeatherSeasonId(season.id), epochHour, cycle);
        if (w === 'fog') routesWithFog.push(rId);
      } catch {
        // Some maps don't have registered weather tables (e.g. buildings)
      }
    }

    console.log('Routes with FOG at this hour:', routesWithFog);
  });
});
