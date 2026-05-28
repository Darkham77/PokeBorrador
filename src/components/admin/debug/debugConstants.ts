/**
 * src/components/admin/debug/debugConstants.ts
 * Constants for debug components.
 */

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
  { id: 'flee', label: 'ESCAPE', icon: '💨' }
]

export const DEBUG_STATUS_CONDITIONS: DebugItem[] = [
  { id: 'burn', label: 'QUEMADO', icon: '🔥' },
  { id: 'poison', label: 'ENVENENADO', icon: '☠️' },
  { id: 'paralysis', label: 'PARALIZADO', icon: '⚡' },
  { id: 'sleep', label: 'DORMIDO', icon: '💤' },
  { id: 'freeze', label: 'CONGELADO', icon: '🧊' },
  { id: 'null', label: 'LIMPIAR', icon: '✨' }
]

export const DEBUG_SECONDARY_EFFECTS: DebugItem[] = [
  { id: 'confused', label: 'CONFUSIÓN', icon: '💫' },
  { id: 'attracted', label: 'ATRACCIÓN', icon: '💖' },
  { id: 'cursed', label: 'MALDICIÓN', icon: '👻' },
  { id: 'seeded', label: 'DRENADORAS', icon: '🌱' },
  { id: 'trapped', label: 'ATRAPADO', icon: '🕸️' },
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
  { id: 'status', label: 'ESTADO', icon: '🧪', cat: 'status' }
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
  { id: 'reflect', label: 'REFLEJO', icon: '🧱' },
  { id: 'lightScreen', label: 'PANTALLA LUZ', icon: '🕯️' },
  { id: 'safeguard', label: 'VELO SAGRADO', icon: '🛡️' },
  { id: 'mist', label: 'NEBLINA', icon: '🌫️' },
  { id: 'spikes', label: 'PÚAS', icon: '🌵' }
]

export const DEBUG_WEATHER_EFFECTS: DebugItem[] = [
  { id: 'clear', label: 'DESPEJADO', icon: '🌈', desc: 'Cielo despejado sin efectos atmosféricos.' },
  { id: 'sun', label: 'SOL', icon: '☀️', desc: 'Sol intenso. Potencia fuego, debilita agua.' },
  { id: 'intense_sun', label: 'SOL INTENSO', icon: '🔆', desc: 'Sol extremo. Potencia fuego significativamente.' },
  { id: 'heatwave', label: 'OLA CALOR', icon: '🔥', desc: 'Calor extremo. Probabilidad de quemaduras ambientales.' },
  { id: 'cold', label: 'FRÍO', icon: '🧊', desc: 'Ambiente gélido. Potencia hielo.' },
  { id: 'coldwave', label: 'OLA FRÍO', icon: '🥶', desc: 'Frío extremo. Probabilidad de congelación ambiental.' },
  { id: 'rain', label: 'LLUVIA', icon: '🌧️', desc: 'Lluvia constante. Potencia agua, debilita fuego.' },
  { id: 'heavy_rain', label: 'LLUVIA FUERTE', icon: '☔', desc: 'Lluvia torrencial. Potencia agua significativamente.' },
  { id: 'storm', label: 'TORMENTA', icon: '⛈️', desc: 'Tormenta con lluvia. Trueno infalible.' },
  { id: 'thunderstorm', label: 'T. ELÉCTRICA', icon: '🌩️', desc: 'Tormenta eléctrica intensa. Rayos frecuentes.' },
  { id: 'snow', label: 'NIEVE', icon: '❄️', desc: 'Nieve suave. Sube la Defensa de tipos Hielo.' },
  { id: 'hail', label: 'GRANIZO', icon: '🌨️', desc: 'Granizo cortante. Daño por turno a no-Hielo.' },
  { id: 'blizzard', label: 'VENTISCA', icon: '🌬️', desc: 'Tormenta de nieve. Daño por turno a no-Hielo.' },
  { id: 'fog', label: 'NIEBLA', icon: '🌫️', desc: 'Niebla densa. Reduce la precisión de todos los Pokémon.' },
  { id: 'mist', label: 'BRUMA', icon: '💨', desc: 'Humedad ambiental ligera que reduce suavemente la precisión.' },
  { id: 'sandstorm', label: 'T. ARENA', icon: '🏜️', desc: 'Tormenta de arena. Daño por turno a no-Tierra/Roca/Acero.' },
  { id: 'dust_storm', label: 'T. POLVO', icon: '🌪️', desc: 'Tormenta de polvo densa. Reduce la precisión.' },
  { id: 'wind', label: 'VIENTO', icon: '🍃', desc: 'Viento suave. Facilita el vuelo.' },
  { id: 'strong_winds', label: 'V. FUERTES', icon: '🌀', desc: 'Vientos huracanados. Debilita ataques tipo Volador.' }
]

export const DEBUG_UI_ANIMS: DebugItem[] = [
  { id: 'levelUp', label: 'SUBIDA NIVEL', icon: '📈', desc: 'Destello de subida de nivel en la tarjeta.' },
  { id: 'trainer_in', label: 'ENTRADA ENTRENADOR', icon: '🚶', desc: 'Slide-in desde el lateral.' },
  { id: 'trainer_out', label: 'SALIDA ENTRENADOR', icon: '🏃', desc: 'Slide-out hacia el lateral.' },
  { id: 'bush_wiggle', label: 'WIGGLE HIERBA', icon: '🌿', desc: 'Efecto de balanceo en la hierba de combate.' }
]

export const DEBUG_SPECIAL_MODES: DebugItem[] = [
  { id: 'silhouette', label: 'MODO SILUETA', icon: '👤', desc: 'Alternar visibilidad del Pokémon enemigo.' }
]
