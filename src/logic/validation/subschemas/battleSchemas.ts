/**
 * src/logic/validation/subschemas/battleSchemas.ts
 * 
 * Valibot validation schemas for Active Battle, serialized enemy combatants, weather, and stages.
 */

import {
  object,
  string,
  number,
  boolean,
  union,
  array,
  record,
  optional,
  nullable,
  literal,
  unknown,
  type InferOutput,
} from 'valibot';

import { moveSchema, pokemonEVsSchema } from './pokemonSchemas.ts';

export const enemyPokemonSerializedSchema = object({
  uid: string(),
  id: string(),
  name: string(),
  emoji: optional(string()),
  type: string(),
  level: number(),
  hp: number(),
  maxHp: number(),
  atk: number(),
  def: number(),
  spa: number(),
  spd: number(),
  spe: number(),
  moves: array(moveSchema),
  status: nullable(string()),
  isShiny: boolean(),
  gender: nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N'), literal('')])),
  ivs: record(string(), number()),
  nature: string(),
  ability: string(),
  exp: number(),
  expNeeded: number(),
  friendship: number(),
  _revealed: boolean(),
  _gymLeader: nullable(string()),
  _gymBadge: nullable(string()),
  heldItem: optional(nullable(string())),
  item: optional(nullable(string())),
  lastItem: optional(nullable(string())),
  types: optional(array(string())),
  type2: optional(nullable(string())),
  addedType: optional(nullable(string())),
  evs: optional(pokemonEVsSchema),
  currentPp: optional(record(string(), number())),
  fainted: optional(boolean()),
  statusTurns: optional(number()),
  sleepTurns: optional(number()),
  badPoison: optional(number()),
  substitute: optional(number()),
  confused: optional(number()),
  attracted: optional(boolean()),
  cursed: optional(boolean()),
  seeded: optional(boolean()),
  tauntTurns: optional(number()),
  encoreTurns: optional(number()),
  disabledTurns: optional(number()),
  choiceMove: optional(nullable(string())),
  mustRecharge: optional(boolean()),
  furyCutterCount: optional(number()),
  thrashTurns: optional(number()),
  bound: optional(number()),
  trapped: optional(boolean()),
  perishSongCount: optional(number()),
  focusEnergy: optional(boolean()),
  isTransformed: optional(boolean()),
});

export const battleWeatherSchema = object({
  type: string(),
  visual: optional(nullable(string())),
  turns: number(),
});

export const battleTimedConditionSchema = object({
  turns: number(),
  meta: optional(record(string(), unknown())),
});

export const pendingSlotEffectSchema = object({
  move: union([literal('futuresight'), literal('doomdesire')]),
  side: union([literal('player'), literal('enemy')]),
  targetSlot: number(),
  turnsLeft: number(),
  damage: number(),
  sourceName: optional(nullable(string())),
});

export const stolenResourcesSchema = object({
  money: number(),
  items: record(string(), number()),
});

export const battleLogSchema = object({
  id: string(),
  msg: string(),
  type: string(),
  side: nullable(union([literal('player'), literal('enemy')])),
  icon: nullable(string()),
  iconType: nullable(string()),
});

export const battleStagesSchema = object({
  atk: number(),
  def: number(),
  spa: number(),
  spd: number(),
  spe: number(),
  accuracy: number(),
  evasion: number(),
  reflect: number(),
  lightScreen: number(),
  safeguard: number(),
  mist: number(),
  spikes: number(),
  stealthrock: optional(number()),
  toxicspikes: optional(number()),
  acc: optional(number()),
  eva: optional(number()),
  fissure: optional(number()),
});

export const activeBattleSchema = object({
  isGym: boolean(),
  gymId: nullable(string()),
  isTrainer: boolean(),
  trainerName: nullable(string()),
  trainerSprite: optional(nullable(string())),
  trainerArchetype: optional(nullable(string())),
  quote: optional(nullable(string())),
  locationId: nullable(string()),
  wasSearching: optional(boolean()),
  participants: optional(nullable(array(string()))),
  enemyTeamIndex: optional(number()),
  playerTeamIndex: optional(number()),
  turnCount: optional(number()),
  turn: optional(nullable(union([literal('player'), literal('enemy')]))),
  escapeAttempts: optional(number()),
  cannotEscape: optional(boolean()),
  weather: optional(nullable(battleWeatherSchema)),
  initialMapWeather: optional(nullable(string())),
  terrain: optional(nullable(string())),
  fieldConditions: optional(nullable(record(string(), battleTimedConditionSchema))),
  playerSideConditions: optional(nullable(record(string(), battleTimedConditionSchema))),
  enemySideConditions: optional(nullable(record(string(), battleTimedConditionSchema))),
  pendingSlotEffects: optional(nullable(array(pendingSlotEffectSchema))),
  isFishing: optional(boolean()),
  isArchaeology: optional(boolean()),
  isCave: optional(boolean()),
  isIndoors: optional(boolean()),
  isCrystalCave: optional(boolean()),
  difficulty: optional(nullable(union([literal('easy'), literal('normal'), literal('hard')]))),
  rarity: optional(number()),
  enemyMoney: optional(nullable(number())),
  enemyMaxLevel: optional(nullable(number())),
  rewardTM: optional(nullable(string())),
  enemyInventory: optional(nullable(record(string(), number()))),
  stolenResources: optional(nullable(stolenResourcesSchema)),
  fled: optional(boolean()),
  isCapture: optional(boolean()),
  lastDamage: optional(number()),
  enemyUsedItem: optional(boolean()),
  playerUsedItem: optional(boolean()),
  battleLogs: optional(array(battleLogSchema)),
  playerStages: optional(nullable(battleStagesSchema)),
  enemyStages: optional(nullable(battleStagesSchema)),
  enemyTeam: nullable(array(enemyPokemonSerializedSchema)),
  timestamp: number(),
  isPvP: optional(boolean()),
  isRival: optional(boolean()),
});

export type ActiveBattleDto = InferOutput<typeof activeBattleSchema>;
export type EnemyPokemonSerializedDto = InferOutput<typeof enemyPokemonSerializedSchema>;
export type BattleLogDto = InferOutput<typeof battleLogSchema>;
export type BattleStagesDto = InferOutput<typeof battleStagesSchema>;
