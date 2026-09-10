export const NATURE_DATA = Object.freeze({
  adamant: { name: 'Firme', up: 'Ataque', down: 'At. Esp', desc: '▲ +10% Ataque / ▼ -10% At. Especial', plus: 'atk', minus: 'spa' },
  bashful: { name: 'Tímido', up: null, down: null, desc: 'Sin efecto en estadísticas.', plus: null, minus: null },
  bold: { name: 'Osado', up: 'Defensa', down: 'Ataque', desc: '▲ +10% Defensa / ▼ -10% Ataque', plus: 'def', minus: 'atk' },
  brave: { name: 'Audaz', up: 'Ataque', down: 'Velocidad', desc: '▲ +10% Ataque / ▼ -10% Velocidad', plus: 'atk', minus: 'spe' },
  calm: { name: 'Sereno', up: 'Def. Esp', down: 'Ataque', desc: '▲ +10% Def. Especial / ▼ -10% Ataque', plus: 'spd', minus: 'atk' },
  careful: { name: 'Cauto', up: 'Def. Esp', down: 'At. Esp', desc: '▲ +10% Def. Especial / ▼ -10% At. Especial', plus: 'spd', minus: 'spa' },
  docile: { name: 'Dócil', up: null, down: null, desc: 'Sin efecto en estadísticas.', plus: null, minus: null },
  gentle: { name: 'Amable', up: 'Def. Esp', down: 'Defensa', desc: '▲ +10% Def. Especial / ▼ -10% Defensa', plus: 'spd', minus: 'def' },
  hardy: { name: 'Fuerte', up: null, down: null, desc: 'Sin efecto en estadísticas.', plus: null, minus: null },
  hasty: { name: 'Activa', up: 'Velocidad', down: 'Defensa', desc: '▲ +10% Velocidad / ▼ -10% Defensa', plus: 'spe', minus: 'def' },
  impish: { name: 'Agitada', up: 'Defensa', down: 'At. Esp', desc: '▲ +10% Defensa / ▼ -10% At. Especial', plus: 'def', minus: 'spa' },
  jolly: { name: 'Alegre', up: 'Velocidad', down: 'At. Esp', desc: '▲ +10% Velocidad / ▼ -10% At. Especial', plus: 'spe', minus: 'spa' },
  lax: { name: 'Floja', up: 'Defensa', down: 'Def. Esp', desc: '▲ +10% Defensa / ▼ -10% Def. Especial', plus: 'def', minus: 'spd' },
  lonely: { name: 'Huraña', up: 'Ataque', down: 'Defensa', desc: '▲ +10% Ataque / ▼ -10% Defensa', plus: 'atk', minus: 'def' },
  mild: { name: 'Afable', up: 'At. Esp', down: 'Defensa', desc: '▲ +10% At. Especial / ▼ -10% Defensa', plus: 'spa', minus: 'def' },
  modest: { name: 'Modesta', up: 'At. Esp', down: 'Ataque', desc: '▲ +10% At. Especial / ▼ -10% Ataque', plus: 'spa', minus: 'atk' },
  naive: { name: 'Ingenua', up: 'Velocidad', down: 'Def. Esp', desc: '▲ +10% Velocidad / ▼ -10% Def. Especial', plus: 'spe', minus: 'spd' },
  naughty: { name: 'Pícara', up: 'Ataque', down: 'Def. Esp', desc: '▲ +10% Ataque / ▼ -10% Def. Especial', plus: 'atk', minus: 'spd' },
  quiet: { name: 'Mansa', up: 'At. Esp', down: 'Velocidad', desc: '▲ +10% At. Especial / ▼ -10% Velocidad', plus: 'spa', minus: 'spe' },
  quirky: { name: 'Rara', up: null, down: null, desc: 'Sin efecto en estadísticas.', plus: null, minus: null },
  rash: { name: 'Alocada', up: 'At. Esp', down: 'Def. Esp', desc: '▲ +10% At. Especial / ▼ -10% Def. Especial', plus: 'spa', minus: 'spd' },
  relaxed: { name: 'Plácida', up: 'Defensa', down: 'Velocidad', desc: '▲ +10% Defensa / ▼ -10% Velocidad', plus: 'def', minus: 'spe' },
  sassy: { name: 'Grosera', up: 'Def. Esp', down: 'Velocidad', desc: '▲ +10% Def. Especial / ▼ -10% Velocidad', plus: 'spd', minus: 'spe' },
  serious: { name: 'Seria', up: null, down: null, desc: 'Sin efecto en estadísticas.', plus: null, minus: null },
  timid: { name: 'Miedosa', up: 'Velocidad', down: 'Ataque', desc: '▲ +10% Velocidad / ▼ -10% Ataque', plus: 'spe', minus: 'atk' }
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

const NATURES_BY_SPANISH_NAME: Readonly<Record<string, (typeof NATURE_DATA)[NatureId]>> = Object.freeze( // open-record: Generic key-value data dictionary container
  Object.fromEntries(
    Object.values(NATURE_DATA).map(n => [n.name.toLowerCase(), n]) // text-ok: UI text display localization string
  )
);

export function getNatureDataByNameOrId(key: string): (typeof NATURE_DATA)[NatureId] | undefined {
  const lower = key.toLowerCase(); // text-ok: UI text display localization string
  if (isNatureId(lower)) return NATURE_DATA[lower];
  return NATURES_BY_SPANISH_NAME[lower];
}


