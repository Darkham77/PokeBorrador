/**
 * src/logic/battle/battleUiUtils.js
 * UI mappings and helpers for battle components.
 */

export const STATUS_EMOJI_MAP = {
  burn: '🔥',
  poison: '🟣',
  sleep: '💤',
  paralyze: '⚡',
  freeze: '🧊'
}

export const STATUS_TOOLTIP_MAP = {
  burn: 'QUEMADO: Pierde 1/8 HP por turno y su Ataque Físico se reduce al 50%.',
  poison: 'ENVENENADO: Pierde 1/8 HP por turno.',
  sleep: 'DORMIDO: No puede atacar durante 1-3 turnos.',
  paralyze: 'PARALIZADO: Su Velocidad se reduce al 25% y tiene un 25% de probabilidad de no atacar.',
  freeze: 'CONGELADO: No puede atacar. 20% de probabilidad de descongelarse cada turno.'
}

export const STAT_EMOJI_MAP = {
  atk: { icon: '⚔️', name: 'Ataque' },
  def: { icon: '🛡️', name: 'Defensa' },
  spa: { icon: '✨', name: 'At. Esp' },
  spd: { icon: '🔰', name: 'Def. Esp' },
  spe: { icon: '💨', name: 'Velocidad' },
  acc: { icon: '🎯', name: 'Precisión' },
  eva: { icon: '🌪️', name: 'Evasión' }
}
