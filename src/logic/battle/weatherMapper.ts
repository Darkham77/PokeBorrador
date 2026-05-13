
/**
 * Weather Mapper System
 * Centralizes the mapping between environmental weather tokens (from Map/Atmosphere)
 * and technical battle mechanical keys.
 */
import { logger } from '../utils/logger.ts';

export const WEATHER_MECHANICAL = {
  SUN: 'sun',
  HEATWAVE: 'heatwave',
  RAIN: 'rain',
  STORM: 'storm',
  SANDSTORM: 'sandstorm',
  DUST_STORM: 'dust_storm',
  SNOW: 'snow',
  HAIL: 'hail',
  BLIZZARD: 'blizzard',
  FOG: 'fog',
  MIST: 'mist',
  WIND: 'wind',
  STRONG_WINDS: 'strong_winds',
  CLEAR: 'clear',
  UNKNOWN: 'unknown'
} as const;

export type WeatherMechanical = typeof WEATHER_MECHANICAL[keyof typeof WEATHER_MECHANICAL];

const MAP_TO_MECHANICAL: Record<string, WeatherMechanical> = {
  // Temperature Group (Calor)
  'sun': WEATHER_MECHANICAL.SUN,
  'heatwave': WEATHER_MECHANICAL.HEATWAVE,
  'intense_sun': WEATHER_MECHANICAL.HEATWAVE,
  
  // Temperature Group (Frío)
  'cold': WEATHER_MECHANICAL.SNOW,
  'coldwave': WEATHER_MECHANICAL.HAIL,
  'hail': WEATHER_MECHANICAL.HAIL,

  // Water Group (Precipitación)
  'rain': WEATHER_MECHANICAL.RAIN,
  'storm': WEATHER_MECHANICAL.STORM,
  'thunderstorm': WEATHER_MECHANICAL.STORM,
  'heavy_rain': WEATHER_MECHANICAL.STORM,
  
  // Snow/Ice Group (Precipitación)
  'snow': WEATHER_MECHANICAL.SNOW,
  'blizzard': WEATHER_MECHANICAL.BLIZZARD,

  // Sand Group (Tierra)
  'sandstorm': WEATHER_MECHANICAL.SANDSTORM,
  'dust_storm': WEATHER_MECHANICAL.DUST_STORM,
  
  // Fog Group (Humedad)
  'fog': WEATHER_MECHANICAL.FOG,
  'mist': WEATHER_MECHANICAL.MIST,

  // Air Group (Viento)
  'wind': WEATHER_MECHANICAL.WIND,
  'strong_winds': WEATHER_MECHANICAL.STRONG_WINDS,
  
  // Neutral
  'clear': WEATHER_MECHANICAL.CLEAR,
  'null': WEATHER_MECHANICAL.CLEAR
};

/**
 * Converts any environmental weather token to its combat-mechanical equivalent.
 */
export function getMechanicalWeather(type: string | null | undefined): WeatherMechanical {
  if (!type || type === 'clear' || type === 'null') return WEATHER_MECHANICAL.CLEAR;
  
  const lower = type.toLowerCase();
  const result = MAP_TO_MECHANICAL[lower];

  if (!result) {
    logger.warn('WeatherIntegrity', `Token de clima no registrado detectado: "${type}".`);
    return WEATHER_MECHANICAL.UNKNOWN;
  }

  return result;
}

/**
 * Converts any environmental weather token to its visual AtmosphereLayer equivalent.
 */
export function getVisualWeather(type: string | null | undefined): string {
  if (!type) return 'clear';
  const lower = type.toLowerCase();
  
  // Lista de tokens soportados directamente por AtmosphereLayer
  const VALID_VISUALS = ['rain', 'storm', 'heatwave', 'sun', 'cold', 'coldwave', 'snow', 'blizzard', 'sandstorm', 'fog', 'mist', 'wind', 'strong_winds'];
  if (VALID_VISUALS.includes(lower)) return lower;

  const mech = getMechanicalWeather(lower);
  return WEATHER_UI_METADATA[mech]?.visual || 'clear';
}

/**
 * UI Metadata for each mechanical weather
 */
export const WEATHER_UI_METADATA: Record<WeatherMechanical, { icon: string; label: string; visual: string; description: string }> = {
  [WEATHER_MECHANICAL.UNKNOWN]: {
    icon: '⚠️',
    label: 'DESCONOCIDO',
    visual: 'clear',
    description: 'Clima no registrado.'
  },
  [WEATHER_MECHANICAL.SUN]: { 
    icon: '☀️', 
    label: 'SOL',
    visual: 'sun',
    description: 'Potencia Fuego (x1.5), debilita Agua (x0.5). Rayo Solar sin carga y Síntesis cura más.' 
  },
  [WEATHER_MECHANICAL.HEATWAVE]: { 
    icon: '🔥', 
    label: 'OLA CALOR',
    visual: 'heatwave',
    description: 'Calor extremo. Potencia Fuego (x1.5), el Agua se evapora (x0). Rayo Solar sin carga.' 
  },
  [WEATHER_MECHANICAL.RAIN]: { 
    icon: '☔', 
    label: 'LLUVIA',
    visual: 'rain',
    description: 'Potencia Agua (x1.5), debilita Fuego (x0.5). Trueno y Vendaval nunca fallan.' 
  },
  [WEATHER_MECHANICAL.STORM]: { 
    icon: '⚡', 
    label: 'TORMENTA',
    visual: 'storm',
    description: 'Tormenta eléctrica. Potencia Agua (x1.5), el Fuego se extingue (x0). Trueno nunca falla.' 
  },
  [WEATHER_MECHANICAL.SANDSTORM]: { 
    icon: '🏜️', 
    label: 'T. ARENA',
    visual: 'sandstorm',
    description: 'Daña a tipos no Tierra/Roca/Acero. Sube un 50% la Def. Especial de los tipo Roca.' 
  },
  [WEATHER_MECHANICAL.DUST_STORM]: { 
    icon: '🌫️', 
    label: 'T. POLVO',
    visual: 'sandstorm',
    description: 'Visibilidad reducida. Daña a tipos no Tierra/Roca/Acero y baja la precisión.' 
  },
  [WEATHER_MECHANICAL.SNOW]: { 
    icon: '❄️', 
    label: 'NIEVE',
    visual: 'snow',
    description: 'Sube un 50% la Defensa de los tipo Hielo. Ventisca nunca falla.' 
  },
  [WEATHER_MECHANICAL.HAIL]: { 
    icon: '🌨️', 
    label: 'GRANIZO',
    visual: 'blizzard',
    description: 'Daña a tipos no Hielo cada turno. Ventisca nunca falla.' 
  },
  [WEATHER_MECHANICAL.BLIZZARD]: { 
    icon: '🌬️', 
    label: 'VENTISCA',
    visual: 'blizzard',
    description: 'Frío extremo. Daña a tipos no Hielo, sube su Defensa y Ventisca nunca falla.' 
  },
  [WEATHER_MECHANICAL.FOG]: { 
    icon: '🌫️', 
    label: 'NIEBLA',
    visual: 'fog',
    description: 'Niebla densa que reduce drásticamente la precisión de todos los movimientos.' 
  },
  [WEATHER_MECHANICAL.MIST]: { 
    icon: '🌫️', 
    label: 'BRUMA',
    visual: 'fog',
    description: 'Humedad ligera que reduce suavemente la precisión de los movimientos.' 
  },
  [WEATHER_MECHANICAL.WIND]: {
    icon: '🍃',
    label: 'VIENTO',
    visual: 'wind',
    description: 'Brisa constante que activa habilidades de viento.'
  },
  [WEATHER_MECHANICAL.STRONG_WINDS]: {
    icon: '🌀',
    label: 'V. FUERTES',
    visual: 'strong_winds',
    description: 'Corrientes de aire Delta que eliminan las debilidades del tipo Volador.'
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
  'heatwave': {
    icon: '🔥',
    label: 'OLA CALOR',
    description: 'Calor extremo (Tierra del Fin). Potencia Fuego y el Agua se evapora por completo.'
  },
  'storm': {
    icon: '⚡',
    label: 'TORMENTA',
    description: 'Tormenta eléctrica (Mar del Albor). Potencia Agua y el Fuego se extingue por completo.'
  },
  'blizzard': {
    icon: '🌬️',
    label: 'VENTISCA',
    description: 'Tormenta de nieve violenta. Daña a tipos no Hielo y sube su Defensa.'
  },
  'cold': {
    icon: '❄️',
    label: 'FRÍO',
    description: 'Ambiente gélido que sube un 50% la Defensa de los tipo Hielo.'
  },
  'coldwave': {
    icon: '🥶',
    label: 'OLA FRÍO',
    description: 'Frío extremo que daña a tipos no Hielo y sube su Defensa.'
  },
  'fog': {
    icon: '🌫️',
    label: 'NIEBLA',
    description: 'Niebla densa (Gen 4). Reduce drásticamente la Precisión de todos los Pokémon.'
  },
  'mist': {
    icon: '🌫️',
    label: 'BRUMA',
    description: 'Humedad ambiental ligera que reduce suavemente la precisión.'
  },
  'strong_winds': {
    icon: '🌀',
    label: 'V. FUERTES',
    description: 'Corrientes de aire (Delta Stream). Elimina las debilidades del tipo Volador.'
  }
};
