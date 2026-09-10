// ui-demo/src/data/mockSelectionPokemon.ts

export interface SelectionDemoPokemon {
  uid: string
  id: number
  name: string
  nickname?: string
  gender?: 'm' | 'f'
  level: number
  ivs: number
  total: number
  types: { id: string; label: string }[]
  hp: number
  maxHp: number
  tier: string
  tierColor: string
  tierBg: string
  source: 'team' | 'box'
  badges: string[]
  seasonViolation?: string
}

export const MOCK_SELECTION_ITEMS: SelectionDemoPokemon[] = [
  {
    uid: 'sel-dragonite-85',
    id: 149,
    name: 'DRAGONITE',
    gender: 'm',
    level: 85,
    ivs: 99,
    total: 701,
    types: [
      { id: 'dragon', label: 'DRAGÓN' },
      { id: 'flying', label: 'VOLADOR' }
    ],
    hp: 266,
    maxHp: 274,
    tier: 'C',
    tierColor: '#22c55e',
    tierBg: 'rgba(34, 197, 94, 0.1)',
    source: 'team',
    badges: ['spider', 'star']
  },
  {
    uid: 'sel-nidorino-52',
    id: 33,
    name: 'NIDORINO',
    gender: 'm',
    level: 52,
    ivs: 112,
    total: 479,
    types: [{ id: 'poison', label: 'VENENO' }],
    hp: 140,
    maxHp: 141,
    tier: 'B',
    tierColor: '#3b82f6',
    tierBg: 'rgba(59, 130, 246, 0.1)',
    source: 'team',
    badges: ['spider', 'star']
  },
  {
    uid: 'sel-wartortle-35',
    id: 8,
    name: 'WARTORTLE',
    gender: 'm',
    level: 35,
    ivs: 83,
    total: 490,
    types: [{ id: 'water', label: 'AGUA' }],
    hp: 93,
    maxHp: 94,
    tier: 'D',
    tierColor: '#f97316',
    tierBg: 'rgba(249, 115, 22, 0.1)',
    source: 'team',
    badges: ['spider']
  },
  {
    uid: 'sel-dratini-26',
    id: 147,
    name: 'DRATINI',
    gender: 'f',
    level: 26,
    ivs: 140,
    total: 442,
    types: [{ id: 'dragon', label: 'DRAGÓN' }],
    hp: 59,
    maxHp: 59,
    tier: 'A',
    tierColor: '#a855f7',
    tierBg: 'rgba(168, 85, 247, 0.1)',
    source: 'team',
    badges: ['31', 'spider', 'trophy']
  },
  {
    uid: 'sel-ninetales-44',
    id: 38,
    name: 'NINETALES',
    gender: 'f',
    level: 44,
    ivs: 140,
    total: 647,
    types: [{ id: 'fire', label: 'FUEGO' }],
    hp: 127,
    maxHp: 128,
    tier: 'A',
    tierColor: '#a855f7',
    tierBg: 'rgba(168, 85, 247, 0.1)',
    source: 'team',
    badges: ['spider']
  },
  {
    uid: 'sel-snorlax-25',
    id: 143,
    name: 'SNORLAX',
    gender: 'm',
    level: 25,
    ivs: 138,
    total: 678,
    types: [{ id: 'normal', label: 'NORMAL' }],
    hp: 310,
    maxHp: 310,
    tier: 'B',
    tierColor: '#3b82f6',
    tierBg: 'rgba(59, 130, 246, 0.1)',
    source: 'box',
    badges: ['wand']
  },
  {
    uid: 'sel-jolteon-56',
    id: 135,
    name: 'JOLTEON',
    gender: 'm',
    level: 56,
    ivs: 149,
    total: 674,
    types: [{ id: 'electric', label: 'ELÉCTRICO' }],
    hp: 180,
    maxHp: 180,
    tier: 'A',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.1)',
    source: 'box',
    badges: ['star'],
    seasonViolation: 'Nivel excede el límite de la temporada...'
  },
  {
    uid: 'sel-tentacruel-39',
    id: 73,
    name: 'TENTACRUEL',
    gender: 'f',
    level: 39,
    ivs: 152,
    total: 667,
    types: [
      { id: 'water', label: 'AGUA' },
      { id: 'poison', label: 'VENENO' }
    ],
    hp: 195,
    maxHp: 195,
    tier: 'A',
    tierColor: '#a855f7',
    tierBg: 'rgba(168, 85, 247, 0.1)',
    source: 'box',
    badges: []
  },
  {
    uid: 'sel-starmie-42',
    id: 121,
    name: 'STARMIE',
    level: 42,
    ivs: 141,
    total: 661,
    types: [
      { id: 'water', label: 'AGUA' },
      { id: 'psychic', label: 'PSÍQUICO' }
    ],
    hp: 175,
    maxHp: 175,
    tier: 'A',
    tierColor: '#a855f7',
    tierBg: 'rgba(168, 85, 247, 0.1)',
    source: 'box',
    badges: []
  },
  {
    uid: 'sel-gengar-60',
    id: 94,
    name: 'GENGAR',
    gender: 'f',
    level: 60,
    ivs: 159,
    total: 661,
    types: [
      { id: 'ghost', label: 'FANTASMA' },
      { id: 'poison', label: 'VENENO' }
    ],
    hp: 160,
    maxHp: 160,
    tier: 'A',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.1)',
    source: 'team',
    badges: ['wand', 'star'],
    seasonViolation: 'Nivel excede el límite de la temporada...'
  },
  {
    uid: 'sel-golduck-57',
    id: 55,
    name: 'GOLDUCK',
    gender: 'f',
    level: 57,
    ivs: 155,
    total: 655,
    types: [{ id: 'water', label: 'AGUA' }],
    hp: 170,
    maxHp: 170,
    tier: 'A',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.1)',
    source: 'box',
    badges: [],
    seasonViolation: 'Nivel excede el límite de la temporada...'
  },
  {
    uid: 'sel-vileplume-48',
    id: 45,
    name: 'VILEPLUME',
    nickname: 'cacacacaca',
    gender: 'f',
    level: 48,
    ivs: 164,
    total: 654,
    types: [
      { id: 'grass', label: 'PLANTA' },
      { id: 'poison', label: 'VENENO' }
    ],
    hp: 185,
    maxHp: 185,
    tier: 'A',
    tierColor: '#a855f7',
    tierBg: 'rgba(168, 85, 247, 0.1)',
    source: 'box',
    badges: ['wand', 'star']
  },
  {
    uid: 'sel-golem-51',
    id: 76,
    name: 'GOLEM',
    gender: 'm',
    level: 51,
    ivs: 154,
    total: 649,
    types: [
      { id: 'rock', label: 'ROCA' },
      { id: 'ground', label: 'TIERRA' }
    ],
    hp: 190,
    maxHp: 190,
    tier: 'A',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.1)',
    source: 'box',
    badges: ['31', 'star'],
    seasonViolation: 'Nivel excede el límite de la temporada...'
  }
]
