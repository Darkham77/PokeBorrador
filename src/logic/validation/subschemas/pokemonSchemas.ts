/**
 * src/logic/validation/subschemas/pokemonSchemas.ts
 * 
 * Valibot validation schemas for Pokemon entities, moves, IVs, EVs, and eggs.
 */

import {
  object,
  string,
  number,
  boolean,
  pipe,
  minValue,
  maxValue,
  union,
  array,
  record,
  optional,
  nullable,
  literal,
  partial,
  type InferOutput,
} from 'valibot';

import { MAXIMUM_FRIENDSHIP_VALUE } from '@/logic/constants/gameplay.ts';

const MIN_STAT_IV = 0;
const MAX_STAT_IV = 31;
const MIN_STAT_EV = 0;
const MAX_STAT_EV = 252;
const MIN_FRIENDSHIP = 0;

export const pokemonIVsSchema = object({
  hp: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
  atk: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
  def: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
  spa: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
  spd: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
  spe: pipe(number(), minValue(MIN_STAT_IV), maxValue(MAX_STAT_IV)),
});

export const pokemonEVsSchema = object({
  hp: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
  atk: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
  def: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
  spa: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
  spd: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
  spe: pipe(number(), minValue(MIN_STAT_EV), maxValue(MAX_STAT_EV)),
});

export const moveEffectSchema = object({
  type: string(),
  status: optional(nullable(union([literal('par'), literal('brn'), literal('psn'), literal('slp'), literal('frz'), literal('tox')]))),
  stat: optional(string()),
  stages: optional(number()),
  chance: optional(number()),
  val: optional(number()),
  percent: optional(number()),
  text: optional(string()),
});

export const moveSchema = object({
  id: optional(string()),
  name: optional(string()),
  type: optional(string()),
  cat: optional(union([literal('physical'), literal('special'), literal('status')])),
  power: optional(number()),
  acc: optional(union([number(), boolean()])),
  pp: optional(number()),
  maxPP: optional(number()),
  desc: optional(string()),
  drain: optional(union([number(), boolean()])),
  priority: optional(number()),
  crit: optional(number()),
  target: optional(string()),
  effect: optional(union([string(), moveEffectSchema, array(moveEffectSchema)])),
  fixedDmg: optional(number()),
  levelDmg: optional(boolean()),
  halfHP: optional(boolean()),
  hits: optional(union([number(), string(), array(union([number(), string()]))])),
  recoil: optional(union([number(), boolean()])),
  selfKO: optional(boolean()),
  side: optional(union([literal('player'), literal('enemy')])),
  ohko: optional(boolean()),
  endeavor: optional(boolean()),
  counter: optional(boolean()),
  turns: optional(number()),
  sound: optional(boolean()),
});

export const pokemonCompetitionTrophySchema = object({
  eventId: string(),
  eventName: string(),
  categoryId: string(),
  categoryName: string(),
  rank: union([literal('first'), literal('second'), literal('third')]),
  score: number(),
  awardedAt: number(),
});

export type PokemonCompetitionTrophyDto = InferOutput<typeof pokemonCompetitionTrophySchema>;

export const pokemonSchema = object({
  uid: string(),
  id: string(),
  species: string(),
  name: string(),
  nickname: optional(nullable(string())),
  level: pipe(number(), minValue(1), maxValue(100)),
  exp: number(),
  expNeeded: number(),
  hp: number(),
  maxHp: number(),
  atk: number(),
  def: number(),
  spa: number(),
  spd: number(),
  spe: number(),
  type: string(),
  type2: optional(nullable(string())),
  types: optional(array(string())),
  addedType: optional(nullable(string())),
  emoji: optional(string()),
  isShiny: boolean(),
  isGuardian: optional(boolean()),
  isFloating: optional(boolean()),
  gender: optional(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N'), literal('')]))),
  status: optional(union([literal('par'), literal('brn'), literal('psn'), literal('slp'), literal('frz'), literal('tox'), literal('')])),
  statusTurns: optional(number()),
  sleepTurns: optional(number()),
  confused: optional(number()),
  attracted: optional(boolean()),
  cursed: optional(boolean()),
  seeded: optional(boolean()),
  badPoison: optional(number()),
  ingrain: optional(boolean()),
  protect: optional(boolean()),
  detect: optional(boolean()),
  endure: optional(boolean()),
  substitute: optional(number()),
  focusEnergy: optional(boolean()),
  lockOn: optional(boolean()),
  isTransformed: optional(boolean()),
  rageActive: optional(boolean()),
  snatching: optional(boolean()),
  tormentActive: optional(boolean()),
  mustRecharge: optional(boolean()),
  bound: optional(number()),
  tauntTurns: optional(number()),
  encoreTurns: optional(number()),
  disabledTurns: optional(number()),
  flinched: optional(boolean()),
  destinyBond: optional(boolean()),
  perishSongCount: optional(number()),
  ability: optional(string()),
  moves: optional(array(nullable(moveSchema))),
  caught: optional(boolean()),
  isBoxed: optional(boolean()),
  fainted: optional(boolean()),
  currentPp: optional(record(string(), number())),
  _revealed: optional(boolean()),
  _gymLeader: optional(nullable(string())),
  _gymBadge: optional(nullable(string())),
  ivs: optional(pokemonIVsSchema),
  evs: optional(pokemonEVsSchema),
  nature: optional(string()),
  heldItem: optional(nullable(string())),
  item: optional(nullable(string())),
  friendship: optional(pipe(number(), minValue(MIN_FRIENDSHIP), maxValue(MAXIMUM_FRIENDSHIP_VALUE))),
  vigor: optional(number()),
  maxVigor: optional(number()),
  catchRate: optional(number()),
  obtainedAt: optional(number()),
  obtainedMethod: optional(string()),
  isAtmospheric: optional(boolean()),
  weatherOrigin: optional(string()),
  isWeatherStruggling: optional(boolean()),
  region: optional(string()),
  ot_id: optional(string()),
  tags: optional(array(string())),
  onMission: optional(boolean()),
  onDefense: optional(boolean()),
  inDaycare: optional(boolean()),
  daycareSlot: optional(number()),
  daycareDepositedAt: optional(string()),
  furyCutterCount: optional(number()),
  lastMove: optional(nullable(moveSchema)),
  thrashTurns: optional(number()),
  encoreMove: optional(nullable(moveSchema)),
  disabledMove: optional(nullable(moveSchema)),
  pendingMoves: optional(array(moveSchema)),
  trapped: optional(boolean()),
  identified: optional(boolean()),
  pts: optional(number()),
  chargingMove: optional(nullable(moveSchema)),
  aura: optional(string()),
  isAncestral: optional(boolean()),
  choiceMove: optional(nullable(string())),
  form: optional(string()),
  isIllegal: optional(boolean()),
  illegalReasons: optional(array(string())),
  height: optional(number()),
  weight: optional(number()),
  trophies: optional(array(pokemonCompetitionTrophySchema)),
});

const partialPokemonIVsSchema = partial(pokemonIVsSchema);

export const pokemonEggSchema = object({
  uid: string(),
  id: string(),
  pokemonId: optional(nullable(string())),
  steps: number(),
  totalSteps: optional(number()),
  ready: boolean(),
  isShiny: optional(boolean()),
  isGuardian: optional(boolean()),
  nature: optional(string()),
  abilitySlot: optional(number()),
  gender: optional(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N'), literal('')]))),
  ivs: optional(partialPokemonIVsSchema),
  movesAtBirth: optional(array(string())),
  obtainedAt: optional(number()),
  scanned: optional(boolean()),
  predictedInfo: optional(object({
    name: string(),
    ivTotal: number()
  })),
  tint: optional(string()),
  isAncestral: optional(boolean()),
  color: optional(string()),
  isNpc: optional(boolean()),
});

export type PokemonIVsDto = InferOutput<typeof pokemonIVsSchema>;
export type PokemonEVsDto = InferOutput<typeof pokemonEVsSchema>;
export type MoveSchemaDto = InferOutput<typeof moveSchema>;
export type PokemonInstanceDto = InferOutput<typeof pokemonSchema>;
export type PokemonEggDto = InferOutput<typeof pokemonEggSchema>;
