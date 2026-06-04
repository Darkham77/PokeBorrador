
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
    description: 'Día Soleado:\n▲ Potencia Fuego (x1.5)\n▼ Potencia Agua y Hielo (x0.4)\n⚡ Rayo Solar sin carga',
    modifiers: { boost: ['fire', 'grass', 'ground'], debuff: ['water', 'ice'] }
  },
  'heatwave': {
    id: 'heatwave',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'OLA CALOR',
    icon: '🔥',
    visual: 'heatwave',
    description: 'Ola de calor extremo:\n▲ Potencia Fuego (x1.5)\n▼ Potencia Agua (x0.4)\n🚫 Inmune a Hielo y Planta (x0)',
    modifiers: { boost: ['fire', 'ground'], block: ['ice', 'grass'], debuff: ['water'] }
  },
  'intense_sun': {
    id: 'intense_sun',
    mech: WEATHER_MECHANICAL.SUN,
    label: 'SOL INTENSO',
    icon: '🔆',
    visual: 'intense_sun',
    description: 'Sol abrasador:\n▲ Potencia Fuego y Planta (x1.5)\n🚫 Inmune a Agua y Hielo (x0)',
    modifiers: { boost: ['grass', 'fire'], block: ['water', 'ice'] }
  },

  // --- RAIN GROUP ---
  'rain': {
    id: 'rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA',
    icon: '🌧️',
    visual: 'rain',
    description: 'Lluvia constante:\n▲ Potencia Agua y Bicho (x1.5)\n▼ Potencia Fuego y Roca (x0.4)\n⚡ Trueno 100% precisión',
    modifiers: { boost: ['water', 'bug', 'electric'], debuff: ['fire', 'rock', 'ground'] }
  },
  'storm': {
    id: 'storm',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'TORMENTA',
    icon: '⛈️',
    visual: 'storm',
    description: 'Tormenta eléctrica:\n▲ Potencia Agua, Eléctrico y Dragón (x1.5)\n🚫 Inmune a Fuego, Volador y Bicho (x0)',
    modifiers: { boost: ['water', 'electric', 'dragon'], block: ['fire', 'flying', 'bug'], debuff: ['rock', 'ground'] }
  },
  'thunderstorm': {
    id: 'thunderstorm',
    mech: WEATHER_MECHANICAL.CLEAR,
    label: 'T. ELÉCTRICA',
    icon: '🌩️',
    visual: 'thunderstorm',
    description: 'Tormenta con rayos:\n▲ Potencia Eléctrico y Dragón (x1.5)\n▼ Potencia Roca y Tierra (x0.4)',
    modifiers: { boost: ['electric', 'dragon'], debuff: ['rock', 'ground'] }
  },
  'heavy_rain': {
    id: 'heavy_rain',
    mech: WEATHER_MECHANICAL.RAIN,
    label: 'LLUVIA FUERTE',
    icon: '☔',
    visual: 'heavy_rain',
    description: 'Lluvia torrencial:\n▲ Potencia Agua (x1.5)\n🚫 Inmune a Fuego (x0)',
    modifiers: { boost: ['water'], block: ['fire'], debuff: ['rock', 'ground'] }
  },

  // --- SAND GROUP ---
  'sandstorm': {
    id: 'sandstorm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. ARENA',
    icon: '🏜️',
    visual: 'sandstorm',
    description: 'Tormenta de arena:\n▲ Def. Especial tipo Roca (+50%)\n▼ Daña por turno a no Tierra/Roca/Acero',
    modifiers: { boost: ['rock', 'ground', 'steel'], debuff: ['flying', 'bug', 'fire'] }
  },
  'dust_storm': {
    id: 'dust_storm',
    mech: WEATHER_MECHANICAL.SANDSTORM,
    label: 'T. POLVO',
    icon: '🌪️',
    visual: 'dust_storm',
    description: 'Tormenta de polvo:\n▼ Potencia Bicho y Fuego (x0.4)\n🚫 Inmune a Volador (x0)\n▼ Daña por turno',
    modifiers: { boost: ['rock', 'ground'], block: ['flying'], debuff: ['bug'] }
  },

  // --- ICE GROUP ---
  'snow': {
    id: 'snow',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'NIEVE',
    icon: '❄️',
    visual: 'snow',
    description: 'Nevada:\n▲ Defensa tipo Hielo (+50%)\n⚡ Ventisca 100% precisión',
    modifiers: { boost: ['ice', 'steel'], debuff: ['fire', 'bug', 'flying'] }
  },
  'cold': {
    id: 'cold',
    mech: WEATHER_MECHANICAL.SNOW,
    label: 'FRÍO',
    icon: '❄️',
    visual: 'cold',
    description: 'Ambiente gélido:\n▲ Potencia Hielo (x1.5)\n▼ Potencia Bicho y Planta (x0.4)',
    modifiers: { boost: ['ice'], debuff: ['grass', 'bug'] }
  },
  'hail': {
    id: 'hail',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'GRANIZO',
    icon: '🌨️',
    visual: 'hail',
    description: 'Granizada:\n▼ Potencia Fuego, Bicho, Volador y Planta (x0.4)\n▼ Daña por turno a no Hielo',
    modifiers: { boost: ['ice'], debuff: ['fire', 'bug', 'flying', 'grass'] }
  },
  'blizzard': {
    id: 'blizzard',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'VENTISCA',
    icon: '🌬️',
    visual: 'blizzard',
    description: 'Tempestad gélida:\n▲ Potencia Hielo (x1.5)\n🚫 Inmune a Fuego, Planta, Bicho y Volador (x0)\n▼ Daña por turno',
    modifiers: { boost: ['ice'], block: ['fire', 'grass', 'bug', 'flying'], debuff: ['steel', 'rock'] }
  },
  'coldwave': {
    id: 'coldwave',
    mech: WEATHER_MECHANICAL.HAIL,
    label: 'OLA FRÍO',
    icon: '🥶',
    visual: 'coldwave',
    description: 'Frío extremo:\n▼ Velocidad general (-50%)\n🚫 Inmune a Bicho y Planta (x0)\n▼ Daña por turno',
    modifiers: { boost: ['ice'], block: ['grass', 'bug'], debuff: ['fire', 'flying'] }
  },

  // --- FOG GROUP ---
  'fog': {
    id: 'fog',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'NIEBLA',
    icon: '🌫️',
    visual: 'fog',
    description: 'Niebla densa:\n▲ Potencia Fantasma y Siniestro (x1.5)\n▼ Precisión de ataques (al 60%)',
    modifiers: { boost: ['ghost', 'psychic', 'dark'], debuff: ['flying'] }
  },
  'mist': {
    id: 'mist',
    mech: WEATHER_MECHANICAL.FOG,
    label: 'BRUMA',
    icon: '💨',
    visual: 'mist',
    description: 'Bruma mágica (Niebla):\n▲ Potencia Hada y Agua (x1.5)\n▼ Potencia Fuego (x0.4)\n▼ Precisión de ataques (al 60%)',
    modifiers: { boost: ['fairy', 'water'], debuff: ['fire'] }
  },

  // --- WIND GROUP ---
  'wind': {
    id: 'wind',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'VIENTO',
    icon: '🍃',
    visual: 'wind',
    description: 'Viento constante:\n▲ Potencia Volador, Bicho y Psíquico (x1.5)\n▼ Potencia Tierra (x0.4)',
    modifiers: { boost: ['flying', 'bug', 'psychic'], debuff: ['ground'] }
  },
  'strong_winds': {
    id: 'strong_winds',
    mech: WEATHER_MECHANICAL.WIND,
    label: 'V. FUERTES',
    icon: '🌀',
    visual: 'strong_winds',
    description: 'Corrientes Delta:\n▲ Elimina debilidades de Volador\n🚫 Inmune a Bicho y Tierra (x0)',
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
