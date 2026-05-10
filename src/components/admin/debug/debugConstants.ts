/**
 * src/components/admin/debug/debugConstants.js
 * Constants for debug components.
 */

export const DEBUG_SOUNDS = [
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

export const DEBUG_STATUS_CONDITIONS = [
  { id: 'burn', label: 'QUEMADO', icon: '🔥' },
  { id: 'poison', label: 'ENVENENADO', icon: '☠️' },
  { id: 'paralyze', label: 'PARALIZADO', icon: '⚡' },
  { id: 'sleep', label: 'DORMIDO', icon: '💤' },
  { id: 'freeze', label: 'CONGELADO', icon: '🧊' },
  { id: 'null', label: 'LIMPIAR', icon: '✨' }
]

export const DEBUG_SECONDARY_EFFECTS = [
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

export const DEBUG_SYSTEM_ANIMS = [
  { id: 'emergence', label: 'INTRO FASE 1', icon: '🌄', desc: 'Entrada saltando desde arbustos.' },
  { id: 'reveal', label: 'INTRO FASE 3', icon: '👁️', desc: 'Revelar desde silueta.' },
  { id: 'catch', label: 'ENERGÍA CAPTURA', icon: '📥' },
  { id: 'release', label: 'ENERGÍA SALIDA', icon: '📤' },
  { id: 'shake', label: 'SACUDIDA BALL', icon: '🫨' },
  { id: 'shake_damage', label: 'SACUDIDA DAÑO', icon: '💢' },
  { id: 'blink', label: 'PARPADEO', icon: '💡' },
  { id: 'success', label: 'ÉXITO CAPTURA', icon: '🌟' },
  { id: 'faint', label: 'DEBILITAMIENTO', icon: '💀' },
  { id: 'encounter', label: 'ENCUENTRO FULL', icon: '✨', desc: 'Secuencia completa (Salto + Reveal).' }
]

export const DEBUG_ATTACK_FX = [
  { id: 'physical', label: 'FÍSICO', icon: '⚔️', cat: 'physical' },
  { id: 'special', label: 'ESPECIAL', icon: '🔮', cat: 'special' },
  { id: 'status', label: 'ESTADO', icon: '🧪', cat: 'status' }
]

export const DEBUG_STATS = [
  { id: 'atk', label: 'ATK', icon: '⚔️' },
  { id: 'def', label: 'DEF', icon: '🛡️' },
  { id: 'spa', label: 'SPA', icon: '🔮' },
  { id: 'spd', label: 'SPD', icon: '🧱' },
  { id: 'spe', label: 'SPE', icon: '⚡' },
  { id: 'acc', label: 'ACC', icon: '🎯' },
  { id: 'eva', label: 'EVA', icon: '💨' }
]

export const DEBUG_FIELD_EFFECTS = [
  { id: 'reflect', label: 'REFLEJO', icon: '🧱' },
  { id: 'lightScreen', label: 'PANTALLA LUZ', icon: '🕯️' },
  { id: 'safeguard', label: 'VELO SAGRADO', icon: '🛡️' },
  { id: 'mist', label: 'NEBLINA', icon: '🌫️' },
  { id: 'spikes', label: 'PÚAS', icon: '🌵' }
]

export const DEBUG_WEATHER_EFFECTS = [
  { id: 'sun', label: 'SOL', icon: '☀️' },
  { id: 'heatwave', label: 'OLA CALOR', icon: '🔥' },
  { id: 'rain', label: 'LLUVIA', icon: '🌧️' },
  { id: 'storm', label: 'TORMENTA', icon: '⚡' },
  { id: 'sandstorm', label: 'ARENA', icon: '🏜️' },
  { id: 'hail', label: 'GRANIZO', icon: '🌨️' },
  { id: 'snow', label: 'NIEVE', icon: '❄️' },
  { id: 'blizzard', label: 'VENTISCA', icon: '🌬️' },
  { id: 'fog', label: 'NIEBLA', icon: '🌫️' },
  { id: 'clear', label: 'DESPEJADO', icon: '🌈' }
]
