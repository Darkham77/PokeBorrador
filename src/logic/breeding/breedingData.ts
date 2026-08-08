
/**
 * breedingData.ts
 * Almacena los grupos de huevo, compatibilidades y traducciones.
 */

export const EGG_GROUPS: Record<string, string[]> = {
  abra: ['humanshape'],
  aerodactyl: ['flying'],
  alakazam: ['humanshape'],
  arbok: ['dragon', 'ground'],
  arcanine: ['ground'],
  articuno: ['no-eggs'],
  beedrill: ['bug'],
  bellsprout: ['plant'],
  blastoise: ['monster', 'water1'],
  bulbasaur: ['monster', 'plant'],
  butterfree: ['bug'],
  caterpie: ['bug'],
  chansey: ['fairy'],
  charizard: ['dragon', 'monster'],
  charmander: ['dragon', 'monster'],
  charmeleon: ['dragon', 'monster'],
  clefable: ['fairy'],
  clefairy: ['fairy'],
  cleffa: ['no-eggs'],
  cloyster: ['water3'],
  cubone: ['monster'],
  dewgong: ['ground', 'water1'],
  diglett: ['ground'],
  ditto: ['ditto'],
  dodrio: ['flying'],
  doduo: ['flying'],
  dragonair: ['dragon', 'water1'],
  dragonite: ['dragon', 'water1'],
  dratini: ['dragon', 'water1'],
  drowzee: ['humanshape'],
  dugtrio: ['ground'],
  eevee: ['ground'],
  ekans: ['dragon', 'ground'],
  electabuzz: ['humanshape'],
  electrode: ['mineral'],
  elekid: ['no-eggs'],
  exeggcute: ['plant'],
  exeggutor: ['plant'],
  farfetchd: ['flying', 'ground'],
  fearow: ['flying'],
  flareon: ['ground'],
  gastly: ['indeterminate'],
  gengar: ['indeterminate'],
  geodude: ['mineral'],
  gloom: ['plant'],
  golbat: ['flying'],
  goldeen: ['water2'],
  golduck: ['ground', 'water1'],
  golem: ['mineral'],
  graveler: ['mineral'],
  grimer: ['indeterminate'],
  growlithe: ['ground'],
  gyarados: ['dragon', 'water2'],
  haunter: ['indeterminate'],
  hitmonchan: ['humanshape'],
  hitmonlee: ['humanshape'],
  horsea: ['dragon', 'water1'],
  hypno: ['humanshape'],
  igglybuff: ['no-eggs'],
  ivysaur: ['monster', 'plant'],
  jigglypuff: ['fairy'],
  jolteon: ['ground'],
  jynx: ['humanshape'],
  kabuto: ['water1', 'water3'],
  kabutops: ['water1', 'water3'],
  kadabra: ['humanshape'],
  kakuna: ['bug'],
  tangela: ['plant'],
  tauros: ['ground'],
  tentacool: ['water3'],
  tentacruel: ['water3'],
  togepi: ['no-eggs'],
  vaporeon: ['ground'],
  venomoth: ['bug'],
  venonat: ['bug'],
  venusaur: ['monster', 'plant'],
  victreebel: ['plant'],
  vileplume: ['plant'],
  voltorb: ['mineral'],
  vulpix: ['ground'],
  wartortle: ['monster', 'water1'],
  white_stripe_basculin: ['no-eggs'], 
  wigglytuff: ['fairy'],
  zapdos: ['no-eggs'],
  zubat: ['flying'],
};

import { COMPAT_TEXT } from '@/data/breeding/breedingConstants'
export { COMPAT_TEXT }

export const EGG_GROUP_TRANSLATIONS: Record<string, string> = {
  'monster': 'Monstruo',
  'water1': 'Agua 1',
  'water2': 'Agua 2',
  'water3': 'Agua 3',
  'bug': 'Bicho',
  'flying': 'Volador',
  'ground': 'Campo',
  'fairy': 'Hada',
  'plant': 'Planta',
  'humanshape': 'Humanoide',
  'mineral': 'Mineral',
  'indeterminate': 'Amorfo',
  'dragon': 'Dragón',
  'ditto': 'Ditto',
  'no-eggs': 'Desconocido'
};

export const BABY_MAP: Record<string, string> = {
  pikachu: 'pichu',
  clefairy: 'cleffa',
  jigglypuff: 'igglybuff',
  electabuzz: 'elekid',
  magmar: 'magby',
};



/**
 * Constantes de Probabilidad y Herencia
 */
export const BREEDING_CONSTANTS = {
  MASUDA_MULTIPLIER: 4, // Multiplica x4 el shiny rate si los padres son de distinto origen
  HIDDEN_ABILITY_CHANCE: 0.6, // 60% chance de heredar habilidad del slot actual (madre/ditto)
  NATURE_INHERIT_CHANCE: 1.0, // 100% con Piedra Eterna (migrado de Gen 4+ para QoL)
  IV_INHERIT_DEFAULT: 3,
  IV_INHERIT_DESTINY_KNOT: 5,
};

const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const MILLISECONDS_PER_HOUR = 1000 * SECONDS_PER_MINUTE * MINUTES_PER_HOUR

export const EGG_SPAWN_INTERVAL_MS: Record<number, number> = {
  1: MILLISECONDS_PER_HOUR * 8, // Poco interés: 8h
  2: MILLISECONDS_PER_HOUR * 4, // Compatibles: 4h
  3: MILLISECONDS_PER_HOUR * 2, // Muy compatibles: 2h
};
