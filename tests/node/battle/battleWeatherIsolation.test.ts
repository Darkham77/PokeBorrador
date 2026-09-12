import { describe, it, expect } from 'vitest';
import { isNaturalWeatherAllowedInLocation, resolveEffectiveCycleForLocation } from '@/logic/battle/battleTeamCoordinator';

describe('Battle Weather & Lighting Isolation - Unit Tests', () => {
  it('strictly blocks natural weather in gyms regardless of whether it is PvP, PvE, or Trainer battle', () => {
    // Standard Gym PvE
    expect(isNaturalWeatherAllowedInLocation('gym', null, { isGym: true }, { isGym: true })).toBe(false);

    // PvP inside Gym
    expect(isNaturalWeatherAllowedInLocation('gym', null, null, { isPvP: true, locationId: 'gym' } as any)).toBe(false);

    // Gym Leader Rematch
    expect(isNaturalWeatherAllowedInLocation('gym', { isGym: true }, null, null)).toBe(false);
  });

  it('strictly blocks natural weather in caves, crystal caves, and interior buildings', () => {
    // Caves
    expect(isNaturalWeatherAllowedInLocation('rock_tunnel', { isCave: true }, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('cerulean_cave', { isCave: true }, null, { isCave: true } as any)).toBe(false);

    // Crystal Caves
    expect(isNaturalWeatherAllowedInLocation('seafoam_islands', { isCrystalCave: true }, null, null)).toBe(false);

    // Indoors (Silph Co., Pokémon Tower, Pokémart)
    expect(isNaturalWeatherAllowedInLocation('pokemon_tower', { isIndoors: true }, null, null)).toBe(false);
  });

  it('permits natural weather and dynamic day/night cycles on outdoor routes (even in future outdoor PvP)', () => {
    // Route 1 Outdoor Wild
    expect(isNaturalWeatherAllowedInLocation('route1', { isIndoors: false, weatherEnabled: true }, null, null)).toBe(true);

    // Future Outdoor PvP on Route 23
    expect(isNaturalWeatherAllowedInLocation('route23', { isIndoors: false, weatherEnabled: true }, null, { isPvP: true } as any)).toBe(true);
  });

  it('ensures fixed lighting cycle for caves (night) and indoors/gyms (day)', () => {
    // Gym at 10 PM in the real world: still daytime lighting inside gym!
    expect(resolveEffectiveCycleForLocation('gym', null, null, { isGym: true } as any, 'night')).toBe('day');

    // Cave at 12 PM noon in the real world: dark/night lighting inside cave!
    expect(resolveEffectiveCycleForLocation('diglett_cave', { isCave: true }, null, null, 'day')).toBe('night');

    // Outdoor route at 10 PM: night lighting
    expect(resolveEffectiveCycleForLocation('route1', { isIndoors: false }, null, null, 'night')).toBe('night');

    // Outdoor route at 12 PM: day lighting
    expect(resolveEffectiveCycleForLocation('route1', { isIndoors: false }, null, null, 'day')).toBe('day');
  });
});
