
/**
 * Weather Mapper System (Unified Registry)
 * Centralizes the definition of all weather states: mechanical logic, visual representation, and UI metadata.
 */
import { logger } from '../utils/logger.ts';

/**
 * Mechanical groupings for the battle engine logic.
 * These are the core categories the combat formulas care about.
 */
export const WEATHER_MECHANICAL = {
  SUN: 'sun',
  RAIN: 'rain',
  SANDSTORM: 'sandstorm',
  SNOW: 'snow',
  HAIL: 'hail',
  FOG: 'fog',
  WIND: 'wind',
  CLEAR: 'clear',
  UNKNOWN: 'unknown'
} as const;

export type WeatherMechanical = typeof WEATHER_MECHANICAL[keyof typeof WEATHER_MECHANICAL];

export interface WeatherDefinition {
  id: string;               // Raw token used in map/atmosphere (e.g. 'storm')
  mech: WeatherMechanical;  // Mechanical group (e.g. 'rain')
  label: string;            // Human-readable name (e.g. 'TORMENTA')
  icon: string;             // UI Icon
  visual: string;           // AtmosphereLayer animation key
  description: string;      // Tactical description for tooltips
}

/**
 * THE SINGLE SOURCE OF TRUTH FOR WEATHER
 */
const WEATHER_REGISTRY: Record<string, WeatherDefinition> & {
  clear: WeatherDefinition;
  sun: WeatherDefinition;
  rain: WeatherDefinition;
  sandstorm: WeatherDefinition;
  snow: WeatherDefinition;
  hail: WeatherDefinition;
  fog: WeatherDefinition;
  wind: WeatherDefinition;
} = {
  // --- CLEAR ---
  'clear': {
    id: 'clear',
    mech: WEATHER_MECHANICAL.CLEAR,
    label: 'DESPEJADO',
    icon: '',
    visual: 'clear',
    description: ''
  },
  'null': {
    id: 'null',
    mech: WEATHER_MECHANICAL.CLEAR,
    label: 'DESPEJADO',
    icon: '',
    visual: 'clear',
    description: ''
  },

  // --- SUN GROUP ---
  'sun': {
    id: 'sun',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'SOL',
    icon: '☀️',
    visual: 'sun',
    description: 'Potencia Fuego (x1.5), debilita Agua (x0.5). Rayo Solar sin carga.'
  },
  'heatwave': {
    id: 'heatwave',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'OLA CALOR',
    icon: '🔥',
    visual: 'heatwave',
    description: 'Calor extremo. Potencia Fuego (x1.5), el Agua se evapora (x0). Rayo Solar sin carga.'
  },
  'intense_sun': {
    id: 'intense_sun',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'SOL INTENSO',
    icon: '☀️',
    visual: 'sun',
    description: 'Potencia Fuego (x1.5), el Agua se evapora (x0). Rayo Solar sin carga.'
  },

  // --- RAIN GROUP ---
  'rain': {
    id: 'rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA',
    icon: '☔',
    visual: 'rain',
    description: 'Potencia Agua (x1.5), debilita Fuego (x0.5). Trueno y Vendaval nunca fallan.'
  },
  'storm': {
    id: 'storm',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'TORMENTA',
    icon: '⚡',
    visual: 'storm',
    description: 'Tormenta eléctrica. Potencia Agua (x1.5), el Fuego se extingue (x0). Trueno nunca falla.'
  },
  'thunderstorm': {
    id: 'thunderstorm',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'TORMENTA',
    icon: '⚡',
    visual: 'storm',
    description: 'Tormenta eléctrica intensa. Potencia Agua (x1.5) y el Fuego se extingue.'
  },
  'heavy_rain': {
    id: 'heavy_rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA FUERTE',
    icon: '☔',
    visual: 'rain',
    description: 'Lluvia torrencial. Potencia Agua (x1.5) y el Fuego se extingue.'
  },

  // --- SAND GROUP ---
  'sandstorm': {
    id: 'sandstorm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. ARENA',
    icon: '🏜️',
    visual: 'sandstorm',
    description: 'Daña a tipos no Tierra/Roca/Acero. Sube un 50% la Def. Especial de los tipo Roca.'
  },
  'dust_storm': {
    id: 'dust_storm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. POLVO',
    icon: '🌫️',
    visual: 'sandstorm',
    description: 'Visibilidad reducida. Daña a tipos no Tierra/Roca/Acero y baja la precisión.'
  },

  // --- ICE GROUP ---
  'snow': {
    id: 'snow',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'NIEVE',
    icon: '❄️',
    visual: 'snow',
    description: 'Sube un 50% la Defensa de los tipo Hielo. Ventisca nunca falla.'
  },
  'cold': {
    id: 'cold',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'FRÍO',
    icon: '❄️',
    visual: 'snow',
    description: 'Ambiente gélido que sube un 50% la Defensa de los tipo Hielo.'
  },
  'hail': {
    id: 'hail',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'GRANIZO',
    icon: '🌨️',
    visual: 'blizzard',
    description: 'Daña a tipos no Hielo cada turno. Ventisca nunca falla.'
  },
  'blizzard': {
    id: 'blizzard',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'VENTISCA',
    icon: '🌬️',
    visual: 'blizzard',
    description: 'Tormenta de nieve. Daña a tipos no Hielo, sube su Defensa y Ventisca nunca falla.'
  },
  'coldwave': {
    id: 'coldwave',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'OLA FRÍO',
    icon: '🥶',
    visual: 'blizzard',
    description: 'Frío extremo que daña a tipos no Hielo y sube su Defensa.'
  },

  // --- FOG GROUP ---
  'fog': {
    id: 'fog',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'NIEBLA',
    icon: '🌫️',
    visual: 'fog',
    description: 'Niebla densa que reduce drásticamente la precisión de todos los movimientos.'
  },
  'mist': {
    id: 'mist',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'BRUMA',
    icon: '🌫️',
    visual: 'fog',
    description: 'Humedad ligera que reduce suavemente la precisión de los movimientos.'
  },

  // --- WIND GROUP ---
  'wind': {
    id: 'wind',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'VIENTO',
    icon: '🍃',
    visual: 'wind',
    description: 'Brisa constante que activa habilidades de viento.'
  },
  'strong_winds': {
    id: 'strong_winds',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'V. FUERTES',
    icon: '🌀',
    visual: 'strong_winds',
    description: 'Corrientes de aire Delta que eliminan las debilidades del tipo Volador.'
  }
};

/**
 * Converts any environmental weather token to its combat-mechanical equivalent.
 */
export function getMechanicalWeather(type: string | null | undefined): WeatherMechanical {
  if (!type) return WEATHER_MECHANICAL.CLEAR;
  const lower = type.toLowerCase();
  const entry = WEATHER_REGISTRY[lower];

  if (!entry) {
    logger.warn('WeatherIntegrity', `Token de clima no registrado detectado: "${type}".`);
    return WEATHER_MECHANICAL.UNKNOWN;
  }

  return entry.mech;
}

/**
 * Converts any environmental weather token to its visual AtmosphereLayer equivalent.
 */
export function getVisualWeather(type: string | null | undefined): string {
  if (!type) return 'clear';
  const lower = type.toLowerCase();
  const entry = WEATHER_REGISTRY[lower];
  
  return entry?.visual || 'clear';
}

/**
 * BACKWARD COMPATIBILITY: Derived metadata objects for existing UI components.
 * These are now automatically synced from the central registry.
 */

// UI Metadata keyed by Mechanical type (Simplified view)
export const WEATHER_UI_METADATA: Record<WeatherMechanical, { icon: string; label: string; visual: string; description: string }> = {
  [WEATHER_MECHANICAL.UNKNOWN]: { icon: '⚠️', label: 'DESCONOCIDO', visual: 'clear', description: 'Clima no registrado.' },
  [WEATHER_MECHANICAL.CLEAR]: WEATHER_REGISTRY['clear'],
  [WEATHER_MECHANICAL.SUN]: WEATHER_REGISTRY['sun'],
  [WEATHER_MECHANICAL.RAIN]: WEATHER_REGISTRY['rain'],
  [WEATHER_MECHANICAL.SANDSTORM]: WEATHER_REGISTRY['sandstorm'],
  [WEATHER_MECHANICAL.SNOW]: WEATHER_REGISTRY['snow'],
  [WEATHER_MECHANICAL.HAIL]: WEATHER_REGISTRY['hail'],
  [WEATHER_MECHANICAL.FOG]: WEATHER_REGISTRY['fog'],
  [WEATHER_MECHANICAL.WIND]: WEATHER_REGISTRY['wind']
};

// Full Visual Metadata keyed by raw token (Detailed view)
export const WEATHER_VISUAL_METADATA: Record<string, { icon: string; label: string; description: string }> = 
  Object.fromEntries(
    Object.entries(WEATHER_REGISTRY).map(([k, v]) => [k, { icon: v.icon, label: v.label, description: v.description }])
  );
