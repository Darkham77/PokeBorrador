export const NATURE_DATA = Object.freeze({
  adamant: { name: 'Firme', up: 'Ataque', down: 'At. Esp', desc: '▲ +10% Ataque / ▼ -10% At. Especial' },
  bashful: { name: 'Tímido', up: null, down: null, desc: 'Sin efecto en estadísticas.' },
  bold: { name: 'Osado', up: 'Defensa', down: 'Ataque', desc: '▲ +10% Defensa / ▼ -10% Ataque' },
  brave: { name: 'Audaz', up: 'Ataque', down: 'Velocidad', desc: '▲ +10% Ataque / ▼ -10% Velocidad' },
  calm: { name: 'Sereno', up: 'Def. Esp', down: 'Ataque', desc: '▲ +10% Def. Especial / ▼ -10% Ataque' },
  careful: { name: 'Cauto', up: 'Def. Esp', down: 'At. Esp', desc: '▲ +10% Def. Especial / ▼ -10% At. Especial' },
  docile: { name: 'Dócil', up: null, down: null, desc: 'Sin efecto en estadísticas.' },
  gentle: { name: 'Amable', up: 'Def. Esp', down: 'Defensa', desc: '▲ +10% Def. Especial / ▼ -10% Defensa' },
  hardy: { name: 'Fuerte', up: null, down: null, desc: 'Sin efecto en estadísticas.' },
  hasty: { name: 'Activa', up: 'Velocidad', down: 'Defensa', desc: '▲ +10% Velocidad / ▼ -10% Defensa' },
  impish: { name: 'Agitada', up: 'Defensa', down: 'At. Esp', desc: '▲ +10% Defensa / ▼ -10% At. Especial' },
  jolly: { name: 'Alegre', up: 'Velocidad', down: 'At. Esp', desc: '▲ +10% Velocidad / ▼ -10% At. Especial' },
  lax: { name: 'Floja', up: 'Defensa', down: 'Def. Esp', desc: '▲ +10% Defensa / ▼ -10% Def. Especial' },
  lonely: { name: 'Huraña', up: 'Ataque', down: 'Defensa', desc: '▲ +10% Ataque / ▼ -10% Defensa' },
  mild: { name: 'Afable', up: 'At. Esp', down: 'Defensa', desc: '▲ +10% At. Especial / ▼ -10% Defensa' },
  modest: { name: 'Modesta', up: 'At. Esp', down: 'Ataque', desc: '▲ +10% At. Especial / ▼ -10% Ataque' },
  naive: { name: 'Ingenua', up: 'Velocidad', down: 'Def. Esp', desc: '▲ +10% Velocidad / ▼ -10% Def. Especial' },
  naughty: { name: 'Pícara', up: 'Ataque', down: 'Def. Esp', desc: '▲ +10% Ataque / ▼ -10% Def. Especial' },
  quiet: { name: 'Mansa', up: 'At. Esp', down: 'Velocidad', desc: '▲ +10% At. Especial / ▼ -10% Velocidad' },
  quirky: { name: 'Rara', up: null, down: null, desc: 'Sin efecto en estadísticas.' },
  rash: { name: 'Alocada', up: 'At. Esp', down: 'Def. Esp', desc: '▲ +10% At. Especial / ▼ -10% Def. Especial' },
  relaxed: { name: 'Plácida', up: 'Defensa', down: 'Velocidad', desc: '▲ +10% Defensa / ▼ -10% Velocidad' },
  sassy: { name: 'Grosera', up: 'Def. Esp', down: 'Velocidad', desc: '▲ +10% Def. Especial / ▼ -10% Velocidad' },
  serious: { name: 'Seria', up: null, down: null, desc: 'Sin efecto en estadísticas.' },
  timid: { name: 'Miedosa', up: 'Velocidad', down: 'Ataque', desc: '▲ +10% Velocidad / ▼ -10% Ataque' }
} as const);

export type NatureId = keyof typeof NATURE_DATA;

export function isNatureId(raw: string): raw is NatureId {
  return raw in NATURE_DATA;
}

export const NATURES: readonly NatureId[] = Object.keys(NATURE_DATA).filter(isNatureId);

/** Boundary adapter for external data (saves, DB). Throws loudly if invalid. */
export function toNatureId(raw: string): NatureId {
  if (isNatureId(raw)) return raw;
  throw new Error(`[natures] Invalid NatureId: '${raw}'`);
}

/** Returns the nature details with Spanish name, modifiers and description. Fails loudly on invalid nature. */
export function getNatureInfo(nature: NatureId) {
  if (!nature || !(nature in NATURE_DATA)) {
    throw new Error(`[natures] Invalid NatureId: '${nature}'. Must be a valid canonical NatureId.`);
  }
  return NATURE_DATA[nature];
}

