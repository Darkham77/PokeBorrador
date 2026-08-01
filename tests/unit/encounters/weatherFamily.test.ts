import { describe, it, expect } from 'vitest';
import { getWeatherFamily } from '@/data/system/weatherFamilies.ts';
import { WEATHER_REGISTRY, type WeatherId } from '@/logic/weather/weatherRegistry.ts';

describe('Weather System Single Source of Truth Unit Test', () => {
  it('every weather token registered in WEATHER_REGISTRY must resolve to a valid mechanical WeatherFamilyKey', () => {
    const allWeatherIds = Object.keys(WEATHER_REGISTRY) as WeatherId[];
    const unmappedWeathers: string[] = [];

    for (const weatherId of allWeatherIds) {
      const family = getWeatherFamily(weatherId);
      if (!family) {
        unmappedWeathers.push(weatherId);
      }
    }

    expect(unmappedWeathers, `Unmapped weather tokens found: ${unmappedWeathers.join(', ')}`).toEqual([]);
  });

  it('Showdown internal weather names (raindance, sunnyday, etc.) must resolve to their canonical mechanical weather family', () => {
    expect(getWeatherFamily('raindance')).toBe('rain');
    expect(getWeatherFamily('sunnyday')).toBe('sun');
    expect(getWeatherFamily('sandstorm')).toBe('sandstorm');
    expect(getWeatherFamily('hail')).toBe('hail');
    expect(getWeatherFamily('snow')).toBe('snow');
    expect(getWeatherFamily('desolateland')).toBe('sun');
    expect(getWeatherFamily('primordialsea')).toBe('rain');
    expect(getWeatherFamily('deltastream')).toBe('wind');
  });

  it('Special game weather tokens (none, null, clear, mist, fog) must resolve cleanly without returning null', () => {
    expect(getWeatherFamily('none')).toBe('clear');
    expect(getWeatherFamily('null')).toBe('clear');
    expect(getWeatherFamily('clear')).toBe('clear');
    expect(getWeatherFamily('mist')).toBe('fog');
    expect(getWeatherFamily('fog')).toBe('fog');
  });
});
