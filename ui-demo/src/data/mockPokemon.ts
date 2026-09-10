import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { PokemonType } from '@/data/battle/types'
import type { ItemId } from '@/data/inventory/items'
import type { NatureId } from '@/data/battle/natures'
import type { AbilityId } from '@/data/battle/abilities'

function createDemoPokemon(config: {
  uid: string
  id: PokemonSpeciesId
  name: string
  level: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  type: PokemonType
  type2?: PokemonType | null
  isShiny?: boolean
  heldItem?: ItemId | null
  nature: NatureId
  ability: AbilityId
  friendship?: number
  moves: (Move | null)[]
}): Pokemon {
  return {
    uid: config.uid,
    id: config.id,
    species: config.id,
    name: config.name,
    level: config.level,
    exp: 125000,
    expNeeded: 2500,
    hp: config.hp,
    maxHp: config.maxHp,
    atk: config.atk,
    def: config.def,
    spa: config.spa,
    spd: config.spd,
    spe: config.spe,
    type: config.type,
    type2: config.type2 ?? null,
    status: '',
    isShiny: config.isShiny ?? false,
    gender: 'm',
    heldItem: config.heldItem ?? null,
    nature: config.nature,
    ability: config.ability,
    friendship: config.friendship ?? 255,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
    moves: config.moves
  }
}

export const thunderboltMove: Move = {
  id: 'thunderbolt',
  name: 'Rayo',
  type: 'electric',
  cat: 'special',
  power: 90,
  acc: 100,
  pp: 15,
  maxPP: 15,
  desc: 'Fuerte descarga eléctrica que puede paralizar.'
}

export const surfMove: Move = {
  id: 'surf',
  name: 'Surf',
  type: 'water',
  cat: 'special',
  power: 90,
  acc: 100,
  pp: 15,
  maxPP: 15,
  desc: 'Ola gigante que inunda el campo de batalla.'
}

export const flamethrowerMove: Move = {
  id: 'flamethrower',
  name: 'Lanzallamas',
  type: 'fire',
  cat: 'special',
  power: 90,
  acc: 100,
  pp: 15,
  maxPP: 15,
  desc: 'Llama abrasadora que puede causar quemaduras.'
}

export const shadowballMove: Move = {
  id: 'shadowball',
  name: 'Bola Sombra',
  type: 'ghost',
  cat: 'special',
  power: 80,
  acc: 100,
  pp: 15,
  maxPP: 15,
  desc: 'Lanza una masa oscura que puede bajar la Def. Esp.'
}

export const DEMO_TEAM_POKEMON: Pokemon[] = [
  createDemoPokemon({
    uid: 'demo-pika-01',
    id: 'pikachu',
    name: 'Pikachu',
    level: 55,
    hp: 120,
    maxHp: 120,
    atk: 90,
    def: 70,
    spa: 95,
    spd: 80,
    spe: 135,
    type: 'electric',
    isShiny: true,
    heldItem: 'lightball',
    nature: 'timid',
    ability: 'static',
    moves: [thunderboltMove, surfMove]
  }),
  createDemoPokemon({
    uid: 'demo-char-02',
    id: 'charizard',
    name: 'Charizard',
    level: 60,
    hp: 178,
    maxHp: 178,
    atk: 105,
    def: 98,
    spa: 145,
    spd: 105,
    spe: 130,
    type: 'fire',
    type2: 'flying',
    heldItem: 'charcoal',
    nature: 'modest',
    ability: 'blaze',
    moves: [flamethrowerMove, shadowballMove]
  }),
  createDemoPokemon({
    uid: 'demo-gengar-03',
    id: 'gengar',
    name: 'Gengar',
    level: 58,
    hp: 142,
    maxHp: 150,
    atk: 85,
    def: 80,
    spa: 160,
    spd: 95,
    spe: 140,
    type: 'ghost',
    type2: 'poison',
    heldItem: 'spelltag',
    nature: 'timid',
    ability: 'levitate',
    moves: [shadowballMove, thunderboltMove]
  }),
  createDemoPokemon({
    uid: 'demo-snorlax-04',
    id: 'snorlax',
    name: 'Snorlax',
    level: 56,
    hp: 230,
    maxHp: 240,
    atk: 135,
    def: 85,
    spa: 80,
    spd: 130,
    spe: 45,
    type: 'normal',
    heldItem: 'leftovers',
    nature: 'careful',
    ability: 'thickfat',
    moves: [surfMove]
  }),
  createDemoPokemon({
    uid: 'demo-gyarados-05',
    id: 'gyarados',
    name: 'Gyarados',
    level: 57,
    hp: 185,
    maxHp: 185,
    atk: 155,
    def: 99,
    spa: 75,
    spd: 120,
    spe: 101,
    type: 'water',
    type2: 'flying',
    heldItem: 'mysticwater',
    nature: 'adamant',
    ability: 'intimidate',
    moves: [surfMove, flamethrowerMove]
  }),
  createDemoPokemon({
    uid: 'demo-alakazam-06',
    id: 'alakazam',
    name: 'Alakazam',
    level: 59,
    hp: 130,
    maxHp: 130,
    atk: 60,
    def: 65,
    spa: 165,
    spd: 115,
    spe: 150,
    type: 'psychic',
    heldItem: 'twistedspoon',
    nature: 'modest',
    ability: 'synchronize',
    moves: [shadowballMove]
  })
]

export const DEMO_BOX_POKEMON: Pokemon[] = [
  createDemoPokemon({
    uid: 'demo-venusaur-07',
    id: 'venusaur',
    name: 'Venusaur',
    level: 52,
    hp: 160,
    maxHp: 160,
    atk: 95,
    def: 100,
    spa: 125,
    spd: 120,
    spe: 98,
    type: 'grass',
    type2: 'poison',
    nature: 'bold',
    ability: 'overgrow',
    moves: [shadowballMove]
  }),
  createDemoPokemon({
    uid: 'demo-blastoise-08',
    id: 'blastoise',
    name: 'Blastoise',
    level: 53,
    hp: 165,
    maxHp: 165,
    atk: 98,
    def: 125,
    spa: 105,
    spd: 130,
    spe: 92,
    type: 'water',
    nature: 'calm',
    ability: 'torrent',
    moves: [surfMove]
  }),
  createDemoPokemon({
    uid: 'demo-dragonite-09',
    id: 'dragonite',
    name: 'Dragonite',
    level: 55,
    hp: 175,
    maxHp: 175,
    atk: 160,
    def: 115,
    spa: 120,
    spd: 120,
    spe: 100,
    type: 'dragon',
    type2: 'flying',
    nature: 'adamant',
    ability: 'innerfocus',
    moves: [flamethrowerMove, thunderboltMove]
  })
]
