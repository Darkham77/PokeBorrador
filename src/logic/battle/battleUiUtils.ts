
/**
 * src/logic/battle/battleUiUtils.js
 * UI mappings and helpers for battle components.
 */

export const STATUS_EMOJI_MAP = {
  brn: '🔥',
  psn: '🟣',
  slp: '💤',
  par: '⚡',
  frz: '🧊',
  tox: '🟣'
}

export const STATUS_SHORT_LABEL_MAP = {
  brn: 'BRN',
  psn: 'PSN',
  slp: 'SLP',
  par: 'PAR',
  frz: 'FRZ',
  tox: 'TOX'
}

export const STATUS_NAME_MAP = {
  brn: 'QUEMADURA',
  psn: 'VENENO',
  slp: 'SUEÑO',
  par: 'PARÁLISIS',
  frz: 'CONGELACIÓN',
  tox: 'TÓXICO'
}


export const STATUS_TOOLTIP_MAP = {
  brn: 'QUEMADO: Pierde 1/8 HP por turno y su Ataque Físico se reduce al 50%.', // no-magic
  psn: 'ENVENENADO: Pierde 1/8 HP por turno.', // no-magic
  slp: 'DORMIDO: No puede atacar durante 1-3 turnos.', // no-magic
  par: 'PARALIZADO: Su Velocidad se reduce al 50% y tiene un 25% de probabilidad de no atacar.', // no-magic
  frz: 'CONGELADO: No puede atacar. 20% de probabilidad de descongelarse cada turno.', // no-magic
  tox: 'TÓXICO: Envenenamiento grave cuyo daño aumenta exponencialmente cada turno.' // no-magic
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
