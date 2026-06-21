import { describe, it, expect } from 'vitest';
import { mapVisualToOfficialWeather, getLocalizedWeatherName } from '@/logic/weather/weatherGenerationProvider';

describe('Weather Generation Provider', () => {
  describe('mapVisualToOfficialWeather', () => {
    it('should map visual climates correctly in Gen 3', () => {
      expect(mapVisualToOfficialWeather('rain', 3)).toBe('raindance');
      expect(mapVisualToOfficialWeather('storm', 3)).toBe('raindance');
      expect(mapVisualToOfficialWeather('heavy_rain', 3)).toBe('raindance');

      expect(mapVisualToOfficialWeather('sun', 3)).toBe('sunnyday');
      expect(mapVisualToOfficialWeather('heatwave', 3)).toBe('sunnyday');
      expect(mapVisualToOfficialWeather('intense_sun', 3)).toBe('sunnyday');

      expect(mapVisualToOfficialWeather('sandstorm', 3)).toBe('sandstorm');
      expect(mapVisualToOfficialWeather('dust_storm', 3)).toBe('sandstorm');

      expect(mapVisualToOfficialWeather('snow', 3)).toBe('hail');
      expect(mapVisualToOfficialWeather('hail', 3)).toBe('hail');
      expect(mapVisualToOfficialWeather('blizzard', 3)).toBe('hail');
      expect(mapVisualToOfficialWeather('cold', 3)).toBe('hail');

      expect(mapVisualToOfficialWeather('fog', 3)).toBe('none');
      expect(mapVisualToOfficialWeather('mist', 3)).toBe('none');

      expect(mapVisualToOfficialWeather('clear', 3)).toBe('none');
      expect(mapVisualToOfficialWeather(null, 3)).toBe('none');
    });

    it('should map visual climates correctly in Gen 6', () => {
      expect(mapVisualToOfficialWeather('rain', 6)).toBe('raindance');
      expect(mapVisualToOfficialWeather('heavy_rain', 6)).toBe('primordialsea');
      expect(mapVisualToOfficialWeather('intense_sun', 6)).toBe('desolateland');
      expect(mapVisualToOfficialWeather('strong_winds', 6)).toBe('deltastream');
      expect(mapVisualToOfficialWeather('snow', 6)).toBe('hail');
      expect(mapVisualToOfficialWeather('fog', 6)).toBe('fog');
      expect(mapVisualToOfficialWeather('mist', 6)).toBe('fog');
      expect(mapVisualToOfficialWeather('clear', 6)).toBe('none');
    });

    it('should map visual climates correctly in Gen 9', () => {
      expect(mapVisualToOfficialWeather('rain', 9)).toBe('raindance');
      expect(mapVisualToOfficialWeather('heavy_rain', 9)).toBe('primordialsea');
      expect(mapVisualToOfficialWeather('intense_sun', 9)).toBe('desolateland');
      expect(mapVisualToOfficialWeather('strong_winds', 9)).toBe('deltastream');
      expect(mapVisualToOfficialWeather('snow', 9)).toBe('snow');
      expect(mapVisualToOfficialWeather('fog', 9)).toBe('fog');
      expect(mapVisualToOfficialWeather('mist', 9)).toBe('fog');
      expect(mapVisualToOfficialWeather('clear', 9)).toBe('none');
    });
  });

  describe('getLocalizedWeatherName', () => {
    it('should translate weather IDs correctly based on generation', () => {
      expect(getLocalizedWeatherName('sunnyday', 3)).toBe('Sol');
      expect(getLocalizedWeatherName('raindance', 3)).toBe('Lluvia');
      expect(getLocalizedWeatherName('sandstorm', 3)).toBe('T. Arena');
      expect(getLocalizedWeatherName('hail', 3)).toBe('Granizo');
      expect(getLocalizedWeatherName('hail', 9)).toBe('Nieve');
      expect(getLocalizedWeatherName('snow', 9)).toBe('Nieve');
      expect(getLocalizedWeatherName('desolateland', 6)).toBe('Sol Abrasador');
      expect(getLocalizedWeatherName('primordialsea', 6)).toBe('Lluvia Torrencial');
      expect(getLocalizedWeatherName('deltastream', 6)).toBe('Turbulencias');
      expect(getLocalizedWeatherName('none', 3)).toBe('Despejado');
      expect(getLocalizedWeatherName(null, 3)).toBe('Despejado');
    });
  });
});
