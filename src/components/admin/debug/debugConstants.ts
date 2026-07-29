/**
 * src/components/admin/debug/debugConstants.ts
 * Constants for debug components.
 */

import type { WeatherId } from '@/logic/weather/weatherRegistry'

export interface DebugItem {
  id: string;
  label: string;
  icon: string;
  desc?: string;
  cat?: string;
}

export const DEBUG_SOUNDS: DebugItem[] = [
  { id: 'shiny', label: 'SHINY', icon: '✨' },
  { id: 'rival', label: 'RIVAL', icon: '👺' },
  { id: 'levelUp', label: 'LEVEL UP', icon: '📈' },
  { id: 'evolution', label: 'EVOLUCIÓN', icon: '🧬' },
  { id: 'caught', label: 'CAPTURADO', icon: '📦' },
  { id: 'faint', label: 'DEBILITADO', icon: '💀' },
  { id: 'heal', label: 'CURACIÓN', icon: '💊' },
  { id: 'statusDamage', label: 'DAÑO ESTADO', icon: '💢' },
  { id: 'money', label: 'DINERO', icon: '💰' },
  { id: 'item', label: 'ITEM', icon: '🎒' },
  { id: 'wobble', label: 'WOBBLE', icon: '🫨' },
  { id: 'ballHit', label: 'HIT', icon: '🎯' },
  { id: 'flee', label: 'ESCAPE', icon: '💨' },
  { id: 'victoryTrainer', label: 'VIC. ENTRENADOR', icon: '🏆' },
  { id: 'defeat', label: 'DERROTA', icon: '🥀' },
  { id: 'steal', label: 'ROBO', icon: '🕵️' },
  { id: 'siren', label: 'SIRENA', icon: '🚨' }
]

export const DEBUG_STATUS_CONDITIONS: DebugItem[] = [
  { id: 'brn', label: 'QUEMADO', icon: '🔥' },
  { id: 'psn', label: 'ENVENENADO', icon: '☠️' },
  { id: 'par', label: 'PARALIZADO', icon: '⚡' },
  { id: 'slp', label: 'DORMIDO', icon: '💤' },
  { id: 'frz', label: 'CONGELADO', icon: '🧊' },
  { id: 'null', label: 'LIMPIAR', icon: '✨' }
]

export const DEBUG_SECONDARY_EFFECTS: DebugItem[] = [
  { id: 'confused', label: 'CONFUSIÓN (4t)', icon: '🌀' },
  { id: 'tauntTurns', label: 'MOFA (3t)', icon: '🤬' },
  { id: 'substitute', label: 'SUSTITUTO', icon: '🧸' },
  { id: 'disabledTurns', label: 'ANULADO (4t)', icon: '🔒' },
  { id: 'encoreTurns', label: 'OTRA VEZ (3t)', icon: '🔁' },
  { id: 'perishSongCount', label: 'CANTO MORTAL (3t)', icon: '⏳' },
  { id: 'bound', label: 'ATADURA (4t)', icon: '⛓️' },
  { id: 'attracted', label: 'ATRACCIÓN', icon: '❤️' },
  { id: 'cursed', label: 'MALDICIÓN', icon: '👻' },
  { id: 'seeded', label: 'DRENADORAS', icon: '🌱' },
  { id: 'trapped', label: 'ATRAPADO', icon: '🪤' },
  { id: 'ingrain', label: 'ARRAIGADO', icon: '🌳' },
  { id: 'protect', label: 'PROTECCIÓN', icon: '🛡️' },
  { id: 'endure', label: 'AGUANTE', icon: '✊' },
  { id: 'focus_energy', label: 'FOCO ENERG.', icon: '🎯' },
  { id: 'lock_on', label: 'F. BLANCO', icon: '👁️' }
]

export const DEBUG_ENCOUNTER_ANIMS: DebugItem[] = [
  { id: 'emergence', label: '1. SALTO ARBUSTO', icon: '🌄', desc: 'Entrada saltando desde arbustos.' },
  { id: 'reveal', label: '2. REVELAR SILUETA', icon: '👁️', desc: 'Revelar desde silueta.' },
  { id: 'encounter', label: 'SECUENCIA COMPLETA', icon: '✨', desc: 'Secuencia completa (Salto + Reveal).' }
]

export const DEBUG_COMBAT_ANIMS: DebugItem[] = [
  { id: 'shake_damage', label: 'SACUDIDA DAÑO', icon: '💢' },
  { id: 'blink', label: 'PARPADEO BRILLOSO', icon: '💡' },
  { id: 'heal', label: 'CURACIÓN (POCIÓN)', icon: '💊' },
  { id: 'faint', label: 'DEBILITAMIENTO', icon: '💀' },
  { id: 'escape_flee', label: 'ESCAPE (HUMO)', icon: '💨' },
  { id: 'escape_teleport', label: 'ESCAPE (TELEPORT)', icon: '🌀' }
]

export const DEBUG_CATCH_ANIMS: DebugItem[] = [
  { id: 'catch', label: 'FASE 1: RAYO ATRAPAR', icon: '📥' },
  { id: 'shake', label: 'FASE 2: SACUDIDA', icon: '🫨' },
  { id: 'success', label: 'FASE 3: ÉXITO (CLIC)', icon: '🌟' },
  { id: 'release', label: 'FALLA: ESCAPAR', icon: '📤' }
]

export const DEBUG_ATTACK_FX: DebugItem[] = [
  { id: 'physical', label: 'FÍSICO', icon: '⚔️', cat: 'physical' },
  { id: 'special', label: 'ESPECIAL', icon: '🔮', cat: 'special' },
  { id: 'status', label: 'ESTADO', icon: '🧪', cat: 'status' },
  { id: 'selfKO', label: 'EXPLOSIÓN', icon: '💥', cat: 'selfKO' },
  { id: 'recoil', label: 'RETROCESO', icon: '🔙', cat: 'recoil' }
]

export const DEBUG_STATS: DebugItem[] = [
  { id: 'atk', label: 'ATK', icon: '⚔️' },
  { id: 'def', label: 'DEF', icon: '🛡️' },
  { id: 'spa', label: 'SPA', icon: '🔮' },
  { id: 'spd', label: 'SPD', icon: '🧱' },
  { id: 'spe', label: 'SPE', icon: '⚡' },
  { id: 'acc', label: 'ACC', icon: '🎯' },
  { id: 'eva', label: 'EVA', icon: '💨' }
]

export const DEBUG_FIELD_EFFECTS: DebugItem[] = [
  { id: 'electricterrain', label: 'CAMPO ELÉCTRICO', icon: '⚡' },
  { id: 'grassyterrain', label: 'CAMPO HIERBA', icon: '🌿' },
  { id: 'mistyterrain', label: 'CAMPO NIEBLA', icon: '🌸' },
  { id: 'psychicterrain', label: 'CAMPO PSÍQUICO', icon: '🔮' },
  { id: 'trickroom', label: 'TRICK ROOM', icon: '⏳' },
  { id: 'gravity', label: 'GRAVEDAD', icon: '🌌' },
  { id: 'reflect', label: 'REFLEJO', icon: '🧱' },
  { id: 'lightScreen', label: 'PANTALLA LUZ', icon: '🕯️' },
  { id: 'safeguard', label: 'VELO SAGRADO', icon: '🛡️' },
  { id: 'mist', label: 'NEBLINA', icon: '🌫️' },
  { id: 'spikes', label: 'PÚAS', icon: '📌' },
  { id: 'stealthrock', label: 'TRAMPA ROCAS', icon: '🪨' },
  { id: 'toxicspikes', label: 'PÚAS TÓXICAS', icon: '☠️' }
]

export const DEBUG_WEATHER_EFFECTS = [
  { id: 'clear', label: 'DESPEJADO', icon: '🌈', desc: 'Sin efectos atmosféricos.' },
  { id: 'sun', label: 'SOL', icon: '☀️', desc: 'Fuego x1.5, Agua x0.5. Rayo Solar sin turno de carga. Sintesis/Sol de Mañana cura 2/3.' },
  { id: 'intense_sun', label: 'SOL INTENSO (DESOLATE LAND)', icon: '🔆', desc: 'Fuego x1.5. Bloquea totalmente los ataques de tipo Agua.' },
  { id: 'heatwave', label: 'OLA CALOR', icon: '🔥', desc: 'Sol térmico ambiental.' },
  { id: 'rain', label: 'LLUVIA', icon: '🌧️', desc: 'Agua x1.5, Fuego x0.5. Trueno y Vendaval 100% precisión. Sintesis/Sol de Mañana cura 1/4.' },
  { id: 'heavy_rain', label: 'LLUVIA FUERTE (PRIMORDIAL SEA)', icon: '☔', desc: 'Agua x1.5. Bloquea totalmente los ataques de tipo Fuego.' },
  { id: 'storm', label: 'TORMENTA', icon: '⛈️', desc: 'Lluvia intensa con tormenta eléctrica.' },
  { id: 'thunderstorm', label: 'T. ELÉCTRICA', icon: '🌩️', desc: 'Lluvia y actividad eléctrica extrema.' },
  { id: 'snow', label: 'NIEVE', icon: '❄️', desc: 'Aumenta la Defensa x1.5 a Pokémon tipo Hielo (Gen 9). Ventisca 100% precisión.' },
  { id: 'hail', label: 'GRANIZO', icon: '🌨️', desc: 'Daño 1/16 HP a no-Hielo por turno. Ventisca 100% precisión.' },
  { id: 'blizzard', label: 'VENTISCA', icon: '🌬️', desc: 'Granizo y tormenta de nieve.' },
  { id: 'fog', label: 'NIEBLA', icon: '🌫️', desc: 'Reduce la precisión de todos los movimientos a x0.6.' },
  { id: 'sandstorm', label: 'T. ARENA', icon: '🏜️', desc: 'Daño 1/16 HP a no-Tierra/Roca/Acero. Aumenta Defensa Especial x1.5 a tipo Roca.' },
  { id: 'dust_storm', label: 'T. POLVO', icon: '🌪️', desc: 'Tormenta de arena y polvo.' },
  { id: 'wind', label: 'VIENTO', icon: '🍃', desc: 'Corrientes de aire ambiental.' },
  { id: 'strong_winds', label: 'V. FUERTES (DELTA STREAM)', icon: '🌀', desc: 'Elimina las debilidades del tipo Volador.' }
] satisfies readonly (DebugItem & { id: WeatherId })[]

export const DEBUG_UI_ANIMS: DebugItem[] = [
  { id: 'levelUp', label: 'SUBIDA NIVEL', icon: '📈', desc: 'Destello de subida de nivel en la tarjeta.' },
  { id: 'trainer_in', label: 'ENTRADA ENTRENADOR', icon: '🚶', desc: 'Slide-in desde el lateral.' },
  { id: 'trainer_out', label: 'SALIDA ENTRENADOR', icon: '🏃', desc: 'Slide-out hacia el lateral.' },
  { id: 'bush_wiggle', label: 'WIGGLE HIERBA', icon: '🌿', desc: 'Efecto de balanceo en la hierba de combate.' }
]

export const DEBUG_SPECIAL_MODES: DebugItem[] = [
  { id: 'silhouette', label: 'MODO SILUETA', icon: '👤', desc: 'Alternar visibilidad del Pokémon enemigo.' }
]
