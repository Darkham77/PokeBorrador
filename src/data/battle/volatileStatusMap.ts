/**
 * Volatile status definitions and icons mapping for combatants.
 */

export interface VolatileStatusDefinition {
  prop: string;
  icon: string;
  text: string;
  isCounter?: boolean;
}

export const VOLATILE_STATUS_LIST: VolatileStatusDefinition[] = [
  { prop: 'confused', icon: '🌀', text: 'CONFUNDIDO: Puede golpearse a sí mismo.' },
  { prop: 'attracted', icon: '❤️', text: 'ENAMORADO: Puede no atacar por atracción.' },
  { prop: 'cursed', icon: '👻', text: 'MALDITO: Pierde 1/4 HP cada turno.' },
  { prop: 'seeded', icon: '🌱', text: 'DRENADORAS: Pierde HP cada turno y cura al rival.' },
  { prop: 'badPoison', icon: '☣️', text: 'TÓXICO: El daño del veneno aumenta cada turno.' },
  { prop: 'endure', icon: '🛡️', text: 'AGUANTE: Sobrevivirá el próximo golpe fatal.' },
  { prop: 'trapped', icon: '🪤', text: 'ATRAPADO: No puede escapar del combate.' },
  { prop: 'disabledTurns', icon: '🔒', text: 'ANULADO: Un movimiento está bloqueado', isCounter: true },
  { prop: 'encoreTurns', icon: '🔁', text: 'OTRA VEZ: Repite el mismo movimiento', isCounter: true },
  { prop: 'tauntTurns', icon: '🤐', text: 'MOFA: No puede usar movimientos de estado', isCounter: true },
  { prop: 'flinched', icon: '💫', text: 'RETROCEDER: No puede atacar este turno.' },
  { prop: 'protect', icon: '🛡️', text: 'PROTECCIÓN: Evita el daño este turno.' },
  { prop: 'detect', icon: '🛡️', text: 'PROTECCIÓN: Evita el daño este turno.' },
  { prop: 'substitute', icon: '🎭', text: 'SUSTITUTO: Un señuelo de', isCounter: true }, // custom suffix handled in code
  { prop: 'destinyBond', icon: '🔗', text: 'MISMODESTINO: Si el usuario cae, el rival también.' },
  { prop: 'perishSongCount', icon: '⏳', text: 'CANTO MORTAL: El Pokémon caerá en', isCounter: true }, // custom suffix handled in code
  { prop: 'ingrain', icon: '🌳', text: 'ARRAIGO: Recupera HP cada turno pero no puede ser retirado.' },
  { prop: 'focusEnergy', icon: '🎯', text: 'FOCO ENERGÍA: Aumenta la probabilidad de golpes críticos.' },
  { prop: 'lockOn', icon: '👁️', text: 'FIJAR BLANCO: El próximo ataque no fallará.' },
  { prop: 'isTransformed', icon: '✨', text: 'TRANSFORMADO: Copia la apariencia y ataques del rival.' },
  { prop: 'rageActive', icon: '💢', text: 'FURIA: Su Ataque sube al recibir daño.' },
  { prop: 'snatching', icon: '🧤', text: 'ROBO: Robará el próximo movimiento de estado beneficioso.' },
  { prop: 'tormentActive', icon: '😒', text: 'TORMENTO: No puede usar el mismo movimiento dos veces.' },
  { prop: 'mustRecharge', icon: '🔋', text: 'RECARGA: Debe descansar el próximo turno.' },
  { prop: 'bound', icon: '⛓️', text: 'ATADURA: Sufre daño por atrapamiento', isCounter: true }
];

