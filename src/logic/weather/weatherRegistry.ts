
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
  modifiers?: {             // Mechanical multipliers for types
    boost?: string[];
    debuff?: string[];
    block?: string[];
  }
}

/**
 * THE SINGLE SOURCE OF TRUTH FOR WEATHER
 */
export const WEATHER_REGISTRY: Record<string, WeatherDefinition> & {
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
    description: 'Potencia Fuego (x1.5), debilita Agua/Hielo (x0.4). Rayo Solar sin carga.',
    modifiers: { boost: ['fire', 'grass', 'ground'], debuff: ['water', 'ice'] }
  },
  'heatwave': {
    id: 'heatwave',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'OLA CALOR',
    icon: '🔥',
    visual: 'heatwave',
    description: 'Calor extremo. Potencia Fuego (x1.5). Bloquea Hielo y Planta (x0). El Agua se penaliza.',
    modifiers: { boost: ['fire', 'ground'], block: ['ice', 'grass'], debuff: ['water'] }
  },
  'intense_sun': {
    id: 'intense_sun',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'SOL INTENSO',
    icon: '🔆',
    visual: 'intense_sun',
    description: 'Sol abrasador. Potencia Fuego/Planta. Bloquea Agua y Hielo (x0).',
    modifiers: { boost: ['grass', 'fire'], block: ['water', 'ice'] }
  },

  // --- RAIN GROUP ---
  'rain': {
    id: 'rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA',
    icon: '🌧️',
    visual: 'rain',
    description: 'Potencia Agua/Bicho (x1.5), debilita Fuego/Roca (x0.4). Trueno nunca falla.',
    modifiers: { boost: ['water', 'bug', 'electric'], debuff: ['fire', 'rock', 'ground'] }
  },
  'storm': {
    id: 'storm',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'TORMENTA',
    icon: '⛈️',
    visual: 'storm',
    description: 'Tormenta eléctrica. Potencia Agua/Dragón. Bloquea Fuego, Volador y Bicho (x0).',
    modifiers: { boost: ['water', 'electric', 'dragon'], block: ['fire', 'flying', 'bug'], debuff: ['rock', 'ground'] }
  },
  'thunderstorm': {
    id: 'thunderstorm',
    mech: WEATHER_MECHANICAL.CLEAR,
    label: 'T. ELÉCTRICA',
    icon: '🌩️',
    visual: 'thunderstorm',
    description: 'Fuerte actividad eléctrica. Potencia Eléctrico/Dragón. No afecta al Fuego.',
    modifiers: { boost: ['electric', 'dragon'], debuff: ['rock', 'ground'] }
  },
  'heavy_rain': {
    id: 'heavy_rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA FUERTE',
    icon: '☔',
    visual: 'heavy_rain',
    description: 'Lluvia torrencial. Potencia Agua. Bloquea Fuego (x0).',
    modifiers: { boost: ['water'], block: ['fire'], debuff: ['rock', 'ground'] }
  },

  // --- SAND GROUP ---
  'sandstorm': {
    id: 'sandstorm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. ARENA',
    icon: '🏜️',
    visual: 'sandstorm',
    description: 'Daña a tipos no Tierra/Roca/Acero. Sube un 50% la Def. Especial de los tipo Roca.',
    modifiers: { boost: ['rock', 'ground', 'steel'], debuff: ['flying', 'bug', 'fire'] }
  },
  'dust_storm': {
    id: 'dust_storm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. POLVO',
    icon: '🌪️',
    visual: 'dust_storm',
    description: 'Visibilidad nula. Daña por turno. Bloquea Volador (x0) y penaliza Bicho.',
    modifiers: { boost: ['rock', 'ground'], block: ['flying'], debuff: ['bug'] }
  },

  // --- ICE GROUP ---
  'snow': {
    id: 'snow',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'NIEVE',
    icon: '❄️',
    visual: 'snow',
    description: 'Sube un 50% la Defensa de los tipo Hielo. Ventisca nunca falla.',
    modifiers: { boost: ['ice', 'steel'], debuff: ['fire', 'bug', 'flying'] }
  },
  'cold': {
    id: 'cold',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'FRÍO',
    icon: '❄️',
    visual: 'cold',
    description: 'Ambiente gélido. Potencia Hielo. Penaliza Bicho y Planta.',
    modifiers: { boost: ['ice'], debuff: ['grass', 'bug'] }
  },
  'hail': {
    id: 'hail',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'GRANIZO',
    icon: '🌨️',
    visual: 'blizzard',
    description: 'Daña a tipos no Hielo cada turno. Penaliza Fuego, Bicho, Volador y Planta.',
    modifiers: { boost: ['ice'], debuff: ['fire', 'bug', 'flying', 'grass'] }
  },
  'blizzard': {
    id: 'blizzard',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'VENTISCA',
    icon: '🌬️',
    visual: 'blizzard',
    description: 'Tormenta de nieve. Daña por turno. Bloquea Fuego, Planta, Bicho y Volador (x0).',
    modifiers: { boost: ['ice'], block: ['fire', 'grass', 'bug', 'flying'], debuff: ['steel', 'rock'] }
  },
  'coldwave': {
    id: 'coldwave',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'OLA FRÍO',
    icon: '🥶',
    visual: 'coldwave',
    description: 'Frío extremo. Daña por turno y reduce Velocidad (50%). Bloquea Bicho y Planta (x0).',
    modifiers: { boost: ['ice'], block: ['grass', 'bug'], debuff: ['fire', 'flying'] }
  },

  // --- FOG GROUP ---
  'fog': {
    id: 'fog',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'NIEBLA',
    icon: '🌫️',
    visual: 'fog',
    description: 'Niebla densa. Potencia Fantasma/Siniestro. Reduce drásticamente la precisión.',
    modifiers: { boost: ['ghost', 'psychic', 'dark'], debuff: ['flying'] }
  },
  'mist': {
    id: 'mist',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'BRUMA',
    icon: '💨',
    visual: 'mist',
    description: 'Humedad mágica. Potencia Hada/Agua. Penaliza Fuego.',
    modifiers: { boost: ['fairy', 'water'], debuff: ['fire'] }
  },

  // --- WIND GROUP ---
  'wind': {
    id: 'wind',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'VIENTO',
    icon: '🍃',
    visual: 'wind',
    description: 'Brisa constante. Potencia Volador/Psíquico. Penaliza Tierra.',
    modifiers: { boost: ['flying', 'bug', 'psychic'], debuff: ['ground'] }
  },
  'strong_winds': {
    id: 'strong_winds',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'V. FUERTES',
    icon: '🌀',
    visual: 'strong_winds',
    description: 'Corrientes Delta. Elimina debilidades Volador. Bloquea Bicho y Tierra (x0).',
    modifiers: { boost: ['flying', 'dragon', 'psychic'], block: ['bug', 'ground'] }
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
