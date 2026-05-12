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
  { id: 'paralysis', label: 'PARALIZADO', icon: '⚡' },
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

export const DEBUG_ENCOUNTER_ANIMS = [
  { id: 'emergence', label: '1. SALTO ARBUSTO', icon: '🌄', desc: 'Entrada saltando desde arbustos.' },
  { id: 'reveal', label: '2. REVELAR SILUETA', icon: '👁️', desc: 'Revelar desde silueta.' },
  { id: 'encounter', label: 'SECUENCIA COMPLETA', icon: '✨', desc: 'Secuencia completa (Salto + Reveal).' }
]

export const DEBUG_COMBAT_ANIMS = [
  { id: 'shake_damage', label: 'SACUDIDA DAÑO', icon: '💢' },
  { id: 'blink', label: 'PARPADEO BRILLOSO', icon: '💡' },
  { id: 'faint', label: 'DEBILITAMIENTO', icon: '💀' }
]

export const DEBUG_CATCH_ANIMS = [
  { id: 'catch', label: 'FASE 1: RAYO ATRAPAR', icon: '📥' },
  { id: 'shake', label: 'FASE 2: SACUDIDA', icon: '🫨' },
  { id: 'success', label: 'FASE 3: ÉXITO (CLIC)', icon: '🌟' },
  { id: 'release', label: 'FALLA: ESCAPAR', icon: '📤' }
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
