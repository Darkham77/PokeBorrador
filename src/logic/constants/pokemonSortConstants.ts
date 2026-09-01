export interface PokemonSortOption {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
  readonly icon: string
  readonly desc: string
  readonly aliases?: readonly string[]
}

export const POKEMON_SORT_OPTIONS = [
  {
    id: 'recent',
    label: 'MÁS RECIENTES',
    shortLabel: 'REC',
    icon: '🕒',
    desc: 'Orden cronológico de captura o adición.',
    aliases: ['none']
  },
  {
    id: 'level',
    label: 'NIVEL',
    shortLabel: 'LVL',
    icon: '⭐',
    desc: 'Orden por nivel de combate.'
  },
  {
    id: 'ivs',
    label: 'IVs TOTALES',
    shortLabel: 'IVS',
    icon: '🧬',
    desc: 'Potencial genético acumulado.',
    aliases: ['tier']
  },
  {
    id: 'tot',
    label: 'PODER TOTAL',
    shortLabel: 'TOT',
    icon: '💪',
    desc: 'Suma de estadísticas base, IVs genéticos y bonificación por EVs entrenados (4 EVs = 1 IV).',
    aliases: ['bst', 'TOT']
  },
  {
    id: 'pokedex',
    label: 'NÚMERO POKÉDEX',
    shortLabel: 'DEX',
    icon: '📖',
    desc: 'Orden numérico oficial de la Pokédex.',
    aliases: ['pdex']
  },
  {
    id: 'hatched',
    label: 'CRÍA',
    shortLabel: 'CRI',
    icon: '🥚',
    desc: 'Ordenar por Pokémon nacidos de huevo.',
    aliases: ['egg']
  },
  {
    id: 'weight',
    label: 'PESO',
    shortLabel: 'PES',
    icon: '⚖️',
    desc: 'Ordenar por peso corporal en kilogramos.'
  },
  {
    id: 'height',
    label: 'ALTURA',
    shortLabel: 'ALT',
    icon: '📏',
    desc: 'Ordenar por altura corporal en metros.'
  },
  {
    id: 'friendship',
    label: 'AMISTAD',
    shortLabel: 'AMI',
    icon: '💖',
    desc: 'Ordenar por nivel de amistad y vínculo.'
  }
] as const satisfies readonly PokemonSortOption[]

export type PokemonSortKey = (typeof POKEMON_SORT_OPTIONS)[number]['id']

/**
 * Checks if a given active sort key matches an option's id or its aliases.
 */
export function isSortOptionActive(opt: PokemonSortOption, currentKey: string): boolean {
  if (opt.id === currentKey) return true
  if (opt.aliases && opt.aliases.includes(currentKey)) return true
  return false
}
