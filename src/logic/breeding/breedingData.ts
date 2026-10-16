/**
 * breedingData.ts
 * Stores egg groups, compatibility, and mappings.
 */
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

const EGG_GROUP_IDS = [
  'monster',
  'water1',
  'water2',
  'water3',
  'bug',
  'flying',
  'ground',
  'fairy',
  'plant',
  'humanshape',
  'mineral',
  'indeterminate',
  'dragon',
  'ditto',
  'no-eggs'
] as const;

export type EggGroupId = (typeof EGG_GROUP_IDS)[number];

export const EGG_GROUPS: Partial<Record<PokemonSpeciesId, readonly EggGroupId[]>> = {
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
  basculinwhitestriped: ['no-eggs'],
  wigglytuff: ['fairy'],
  zapdos: ['no-eggs'],
  zubat: ['flying']
};

import { COMPAT_TEXT } from '@/data/breeding/breedingConstants';
export { COMPAT_TEXT };

export const EGG_GROUP_TRANSLATIONS: Record<EggGroupId, string> = {
  monster: 'Monstruo',
  water1: 'Agua 1',
  water2: 'Agua 2',
  water3: 'Agua 3',
  bug: 'Bicho',
  flying: 'Volador',
  ground: 'Campo',
  fairy: 'Hada',
  plant: 'Planta',
  humanshape: 'Humanoide',
  mineral: 'Mineral',
  indeterminate: 'Amorfo',
  dragon: 'Dragón',
  ditto: 'Ditto',
  'no-eggs': 'Desconocido'
};

export const BABY_MAP: Partial<Record<PokemonSpeciesId, PokemonSpeciesId>> = {
  // Baby mappings from any stage in line to baby form
  pikachu: 'pichu',
  raichu: 'pichu',
  raichualola: 'pichu',
  clefairy: 'cleffa',
  clefable: 'cleffa',
  jigglypuff: 'igglybuff',
  wigglytuff: 'igglybuff',
  electabuzz: 'elekid',
  electivire: 'elekid',
  magmar: 'magby',
  magmortar: 'magby',
  jynx: 'smoochum',
  hitmonlee: 'tyrogue',
  hitmonchan: 'tyrogue',
  hitmontop: 'tyrogue',
  chansey: 'happiny',
  blissey: 'happiny',
  mrmime: 'mimejr',
  mrmimegalar: 'mimejr',
  mrrime: 'mimejr',
  snorlax: 'munchlax',
  marill: 'azurill',
  azumarill: 'azurill',
  wobbuffet: 'wynaut',
  sudowoodo: 'bonsly',
  roselia: 'budew',
  roserade: 'budew',
  chimecho: 'chingling',
  mantine: 'mantyke',
  lucario: 'riolu',
  togetic: 'togepi',
  togekiss: 'togepi',
  toxtricity: 'toxel',
  toxtricitylowkey: 'toxel'
};

/**
 * Probability and Inheritance Constants
 */
export const BREEDING_CONSTANTS = {
  MASUDA_MULTIPLIER: 4, // Multiplies shiny rate x4 if parents have different origins
  HIDDEN_ABILITY_CHANCE: 0.6, // 60% chance to inherit ability from current slot (mother/ditto)
  NATURE_INHERIT_CHANCE: 1.0, // 100% with Everstone (migrated from Gen 4+ for QoL)
  IV_INHERIT_DEFAULT: 3,
  IV_INHERIT_DESTINY_KNOT: 5,
  EGG_WAR_PTS_CHANCE: 0.1, // 10% chance to gain war points upon hatching eggs
  EGG_WAR_PTS_AMOUNT: 5 // Amount of war points gained per hatching
} as const;

export type BreedingConstantKey = keyof typeof BREEDING_CONSTANTS;

import { MILLISECONDS_PER_HOUR } from '@/logic/constants/gameplay';

export const EGG_SPAWN_INTERVAL_MS: Record<number, number> = {
  1: MILLISECONDS_PER_HOUR * 8, // Low interest: 8h
  2: MILLISECONDS_PER_HOUR * 4, // Compatible: 4h
  3: MILLISECONDS_PER_HOUR * 2 // Very compatible: 2h
};
