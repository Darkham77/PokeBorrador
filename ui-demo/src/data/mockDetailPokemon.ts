// ui-demo/src/data/mockDetailPokemon.ts

export interface PokemonSummaryItem {
  id: number
  name: string
}

export interface DetailPokemon {
  uid: string
  id: number
  dexNum: string
  name: string
  gender: 'm' | 'f'
  type: string
  typeLabel: string
  category: string
  height: string
  weight: string
  nature: string
  ability: string
  vigor: string
  hp: number
  maxHp: number
  level: number
  maxLevel: number
  exp: number
  expNext: number
  friendship: number
  maxFriendship: number
  friendshipTitle: string
  lore: string
  evolButtonText: string
  stats: { name: string; value: number; max: number }[]
  moves: { name: string; type: string; typeLabel: string; pot: string; prec: string; cat: string; pp: string }[]
  evolChain: { id: number; name: string; req: string }[]
}

export const MOCK_DETAIL_PIKACHU: DetailPokemon = {
  uid: 'detail-pikachu',
  id: 25,
  dexNum: '025',
  name: 'PIKACHU',
  gender: 'm',
  type: 'electric',
  typeLabel: 'ELÉCTRICO',
  category: 'Ratón',
  height: '0.4m',
  weight: '6.1kg',
  nature: 'Miedosa',
  ability: 'Electricidad Estática',
  vigor: '10/10',
  hp: 120,
  maxHp: 120,
  level: 55,
  maxLevel: 100,
  exp: 125000,
  expNext: 2500,
  friendship: 255,
  maxFriendship: 255,
  friendshipTitle: 'Cinta Mejores Amigos',
  lore: 'Levanta su cola para vigilar los alrededores. A veces, puede ser alcanzado por un rayo en esa pose.',
  evolButtonText: '💎 EVOLUCIONAR CON PIEDRA',
  stats: [
    { name: 'PS', value: 120, max: 200 },
    { name: 'ATAQUE', value: 85, max: 200 },
    { name: 'DEFENSA', value: 60, max: 200 },
    { name: 'ATQ. ESP.', value: 95, max: 200 },
    { name: 'DEF. ESP.', value: 70, max: 200 },
    { name: 'VELOCIDAD', value: 110, max: 200 }
  ],
  moves: [
    { name: 'RAYO', type: 'electric', typeLabel: 'ELÉCTRICO', pot: '90', prec: '100', cat: 'Especial', pp: '15/15' },
    { name: 'ONDA TRUENO', type: 'electric', typeLabel: 'ELÉCTRICO', pot: '-', prec: '90', cat: 'Estado', pp: '20/20' },
    { name: 'ATAQUE RÁPIDO', type: 'normal', typeLabel: 'NORMAL', pot: '40', prec: '100', cat: 'Físico', pp: '30/30' },
    { name: 'COLA FÉRREA', type: 'steel', typeLabel: 'ACERO', pot: '100', prec: '75', cat: 'Físico', pp: '15/15' }
  ],
  evolChain: [
    { id: 172, name: 'PICHU', req: 'Base' },
    { id: 25, name: 'PIKACHU', req: 'Amistad Alta' },
    { id: 26, name: 'RAICHU', req: 'Piedra Trueno' }
  ]
}

export const MOCK_DETAIL_CHARIZARD: DetailPokemon = {
  ...MOCK_DETAIL_PIKACHU,
  uid: 'detail-charizard',
  id: 6,
  dexNum: '006',
  name: 'CHARIZARD',
  gender: 'm',
  type: 'fire',
  typeLabel: 'FUEGO',
  category: 'Llama',
  height: '1.7m',
  weight: '90.5kg',
  nature: 'Firme',
  ability: 'Mar Llamas',
  vigor: '10/10',
  hp: 215,
  maxHp: 262,
  level: 54,
  lore: 'Escupe un fuego tan caliente que funde las rocas. Causa incendios forestales sin querer.',
  evolButtonText: '💎 FORMA GIGA / MEGA',
  moves: [
    { name: 'LANZALLAMAS', type: 'fire', typeLabel: 'FUEGO', pot: '90', prec: '100', cat: 'Especial', pp: '15/15' },
    { name: 'TAJO AÉREO', type: 'flying', typeLabel: 'VOLADOR', pot: '75', prec: '95', cat: 'Especial', pp: '15/15' },
    { name: 'GARRA DRAGÓN', type: 'dragon', typeLabel: 'DRAGÓN', pot: '80', prec: '100', cat: 'Físico', pp: '15/15' },
    { name: 'TERREMOTO', type: 'ground', typeLabel: 'TIERRA', pot: '100', prec: '100', cat: 'Físico', pp: '10/10' }
  ],
  evolChain: [
    { id: 4, name: 'CHARMANDER', req: 'Base' },
    { id: 5, name: 'CHARMELEON', req: 'Nv. 16' },
    { id: 6, name: 'CHARIZARD', req: 'Nv. 36' }
  ]
}

export const MOCK_DETAIL_GENGAR: DetailPokemon = {
  ...MOCK_DETAIL_PIKACHU,
  uid: 'detail-gengar',
  id: 94,
  dexNum: '094',
  name: 'GENGAR',
  gender: 'f',
  type: 'ghost',
  typeLabel: 'FANTASMA',
  category: 'Sombra',
  height: '1.5m',
  weight: '40.5kg',
  nature: 'Miedosa',
  ability: 'Cuerpo Maldito',
  vigor: '10/10',
  hp: 160,
  maxHp: 160,
  level: 60,
  lore: 'Se esconde en las sombras. Se dice que si alguien siente un frío repentino, es que un Gengar está cerca.',
  evolButtonText: '💎 FORMA GIGA / MEGA',
  moves: [
    { name: 'BOLA SOMBRA', type: 'ghost', typeLabel: 'FANTASMA', pot: '80', prec: '100', cat: 'Especial', pp: '15/15' },
    { name: 'BOMBA LODO', type: 'poison', typeLabel: 'VENENO', pot: '90', prec: '100', cat: 'Especial', pp: '10/10' },
    { name: 'HIPNOSIS', type: 'psychic', typeLabel: 'PSÍQUICO', pot: '-', prec: '60', cat: 'Estado', pp: '20/20' },
    { name: 'COME SUEÑOS', type: 'psychic', typeLabel: 'PSÍQUICO', pot: '100', prec: '100', cat: 'Especial', pp: '15/15' }
  ],
  evolChain: [
    { id: 92, name: 'GASTLY', req: 'Base' },
    { id: 93, name: 'HAUNTER', req: 'Nv. 25' },
    { id: 94, name: 'GENGAR', req: 'Intercambio' }
  ]
}
