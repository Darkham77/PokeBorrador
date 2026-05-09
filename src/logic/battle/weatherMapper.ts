
/**
 * Weather Mapper System
 * Centralizes the mapping between environmental weather tokens (from Map/Atmosphere)
 * and technical battle mechanical keys.
 */
import { logger } from '../utils/logger.ts';

export const WEATHER_MECHANICAL = {
  SUN: 'sun',
  RAIN: 'rain',
  SANDSTORM: 'sandstorm',
  SNOW: 'snow',
  HAIL: 'hail',
  FOG: 'fog',
  CLEAR: 'clear',
  UNKNOWN: 'unknown'
} as const;

export type WeatherMechanical = typeof WEATHER_MECHANICAL[keyof typeof WEATHER_MECHANICAL];

const MAP_TO_MECHANICAL: Record<string, WeatherMechanical> = {
  // Sun Group
  'sun': WEATHER_MECHANICAL.SUN,
  'heatwave': WEATHER_MECHANICAL.SUN,
  'intense_sun': WEATHER_MECHANICAL.SUN,
  
  // Rain Group
  'rain': WEATHER_MECHANICAL.RAIN,
  'storm': WEATHER_MECHANICAL.RAIN,
  'thunderstorm': WEATHER_MECHANICAL.RAIN,
  'heavy_rain': WEATHER_MECHANICAL.RAIN,
  
  // Sand Group
  'sandstorm': WEATHER_MECHANICAL.SANDSTORM,
  'dust_storm': WEATHER_MECHANICAL.SANDSTORM,
  
  // Snow/Ice Group
  'snow': WEATHER_MECHANICAL.SNOW,
  'hail': WEATHER_MECHANICAL.HAIL,
  'blizzard': WEATHER_MECHANICAL.HAIL,
  
  // Fog Group
  'fog': WEATHER_MECHANICAL.FOG,
  'mist': WEATHER_MECHANICAL.FOG,
  
  // Neutral
  'clear': WEATHER_MECHANICAL.CLEAR,
  'null': WEATHER_MECHANICAL.CLEAR
};

/**
 * Converts any environmental weather token to its combat-mechanical equivalent.
 * @param {string} type Environmental weather token (e.g., 'heatwave')
 * @returns {WeatherMechanical} Mechanical weather key (e.g., 'sun')
 */
export function getMechanicalWeather(type: string | null | undefined): WeatherMechanical {
  if (!type || type === 'clear' || type === 'null') return WEATHER_MECHANICAL.CLEAR;
  
  const lower = type.toLowerCase();
  const result = MAP_TO_MECHANICAL[lower];

  if (!result) {
    logger.warn('WeatherIntegrity', `Token de clima no registrado detectado: "${type}". Por favor regístralo en weatherMapper.ts para evitar inconsistencias mecánicas.`);
    return WEATHER_MECHANICAL.UNKNOWN;
  }

  return result;
}

/**
 * Converts any environmental weather token to its visual AtmosphereLayer equivalent.
 * This preserves visual variants (like 'storm' vs 'rain').
 * @param {string} type Environmental weather token
 * @returns {string} Visual token
 */
export function getVisualWeather(type: string | null | undefined): string {
  if (!type) return 'clear';
  const lower = type.toLowerCase();
  
  // Lista de tokens soportados directamente por AtmosphereLayer
  const VALID_VISUALS = ['rain', 'storm', 'heatwave', 'snow', 'blizzard', 'sandstorm', 'fog', 'mist'];
  if (VALID_VISUALS.includes(lower)) return lower;

  // Si no es un visual directo, usamos el mapeo mecánico para obtener el fallback visual
  const mech = getMechanicalWeather(lower);
  return WEATHER_UI_METADATA[mech]?.visual || 'clear';
}

/**
 * UI Metadata for each mechanical weather
 */
export const WEATHER_UI_METADATA: Record<WeatherMechanical, { icon: string; label: string; visual: string; description: string }> = {
  [WEATHER_MECHANICAL.UNKNOWN]: {
    icon: '⚠️',
    label: 'CLIMA DESCONOCIDO',
    visual: 'clear',
    description: 'Este clima no está registrado en el motor de combate. Reportar para sincronizar efectos.'
  },
  [WEATHER_MECHANICAL.SUN]: { 
    icon: '☀️', 
    label: 'SOL',
    visual: 'heatwave',
    description: 'Potencia movimientos Fuego y debilita Agua. Síntesis cura más.' 
  },
  [WEATHER_MECHANICAL.RAIN]: { 
    icon: '☔', 
    label: 'LLUVIA',
    visual: 'rain',
    description: 'Potencia movimientos Agua y debilita Fuego. Trueno nunca falla.' 
  },
  [WEATHER_MECHANICAL.SANDSTORM]: { 
    icon: '🏜️', 
    label: 'T. ARENA',
    visual: 'sandstorm',
    description: 'Daña a tipos no Tierra/Roca/Acero. Sube Def. Esp. a tipo Roca.' 
  },
  [WEATHER_MECHANICAL.SNOW]: { 
    icon: '❄️', 
    label: 'NIEVE',
    visual: 'snow',
    description: 'Sube un 50% la Defensa de los Pokémon de tipo Hielo.' 
  },
  [WEATHER_MECHANICAL.HAIL]: { 
    icon: '🌨️', 
    label: 'GRANIZO',
    visual: 'blizzard',
    description: 'Daña a tipos no Hielo cada turno.' 
  },
  [WEATHER_MECHANICAL.FOG]: { 
    icon: '🌫️', 
    label: 'NIEBLA',
    visual: 'fog',
    description: 'Reduce drásticamente la precisión de todos los Pokémon.' 
  },
  [WEATHER_MECHANICAL.CLEAR]: {
    icon: '',
    label: 'DESPEJADO',
    visual: 'clear',
    description: ''
  }
};

/**
 * Visual Variant Overrides for UI
 */
export const WEATHER_VISUAL_METADATA: Record<string, { icon: string; label: string; description: string }> = {
  'storm': {
    icon: '⚡',
    label: 'TORMENTA',
    description: 'Lluvia intensa con aparato eléctrico. Potencia Agua y Trueno nunca falla.'
  },
  'blizzard': {
    icon: '🌬️',
    label: 'VENTISCA',
    description: 'Tormenta de nieve violenta. Daña a tipos no Hielo y sube su Defensa.'
  },
  'heatwave': {
    icon: '🔥',
    label: 'OLA CALOR',
    description: 'Calor extremo que potencia el Fuego y debilita el Agua. Rayo Solar carga al instante.'
  }
};
