/**
 * src/logic/validation/schemas.ts
 * 
 * Lightweight, tree-shakable validation schemas using Valibot.
 * Secures data boundaries at network and local DB layers.
 */

import { 
  object, 
  string, 
  number, 
  boolean, 
  pipe,
  safeParse, 
  minLength, 
  maxLength, 
  minValue, 
  maxValue,
  union,
  nullish,
  array,
  record,
  optional,
  fallback,
  nullable,
  literal,
  unknown
} from 'valibot';

// User Profile validation schema
export const userProfileSchema = object({
  id: string(),
  username: pipe(
    string(),
    minLength(3, 'Username must be at least 3 characters long'),
    maxLength(20, 'Username cannot exceed 20 characters')
  ),
  level: pipe(
    number(),
    minValue(1, 'Level must be at least 1'),
    maxValue(100, 'Level cannot exceed 100')
  ),
  is_banned: boolean(),
  coins: pipe(
    number(),
    minValue(0, 'Coins cannot be negative')
  )
});

// Network Action schema (e.g. for WebSockets)
export const networkActionSchema = object({
  type: pipe(string(), minLength(1)),
  payload: object({}),
  timestamp: number()
});

// Trainer Name Schema (used in RenameModal)
export const trainerNameSchema = pipe(
  string(),
  minLength(3, 'El nombre debe tener al menos 3 caracteres'),
  maxLength(15, 'El nombre no puede superar los 15 caracteres')
);

// Inferred TypeScript Types


/**
 * Validates data against the User Profile Schema.
 */
export function validateUserProfile(data: unknown) {
  return safeParse(userProfileSchema, data);
}

/**
 * Validates data against the Network Action Schema.
 */
export function validateNetworkAction(data: unknown) {
  return safeParse(networkActionSchema, data);
}

/**
 * Validates trainer name.
 */
export function validateTrainerName(data: unknown) {
  return safeParse(trainerNameSchema, data);
}

// Chat Message validation schema
export const chatMessageSchema = object({
  id: union([string(), number()]),
  user_id: string(),
  username: pipe(string(), minLength(1)),
  message: pipe(string(), minLength(1)),
  player_class: nullish(string()),
  trainer_level: number(),
  created_at: nullish(string())
});


/**
 * Validates chat message.
 */
export function validateChatMessage(data: unknown) {
  return safeParse(chatMessageSchema, data);
}

// Trade Offer validation schema
export const tradeOfferSchema = object({
  id: string(),
  sender_id: string(),
  receiver_id: string(),
  offer_pokemon: nullish(object({})),
  offer_items: object({}),
  offer_money: number(),
  request_pokemon: nullish(object({})),
  request_items: object({}),
  request_money: number(),
  message: string(),
  status: string(),
  created_at: string()
});


/**
 * Validates trade offer.
 */
export function validateTradeOffer(data: unknown) {
  return safeParse(tradeOfferSchema, data);
}

// ==========================================
// POKEMON & SAVE DATA PERSISTENCE SCHEMAS
// ==========================================

// Pokemon IVs validation schema
const pokemonIVsSchema = object({
  hp: fallback(number(), 0),
  atk: fallback(number(), 0),
  def: fallback(number(), 0),
  spa: fallback(number(), 0),
  spd: fallback(number(), 0),
  spe: fallback(number(), 0),
});

// Move Effect validation schema
const moveEffectSchema = object({
  type: string(),
  status: optional(nullable(union([literal('par'), literal('brn'), literal('psn'), literal('slp'), literal('frz'), literal('tox')]))),
  stat: optional(string()),
  stages: optional(number()),
  chance: optional(number()),
  val: optional(number()),
  percent: optional(number()),
  text: optional(string()),
});

// Move validation schema
const moveSchema = object({
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

// Pokemon validation schema
const pokemonSchema = object({
  uid: fallback(string(), ''),
  id: string(),
  name: fallback(string(), ''),
  nickname: fallback(nullable(string()), null),
  level: fallback(pipe(number(), minValue(1), maxValue(100)), 5),
  exp: fallback(number(), 0),
  expNeeded: fallback(number(), 100),
  hp: fallback(number(), 10),
  maxHp: fallback(number(), 10),
  atk: fallback(number(), 5),
  def: fallback(number(), 5),
  spa: fallback(number(), 5),
  spd: fallback(number(), 5),
  spe: fallback(number(), 5),
  type: fallback(string(), ''),
  type2: optional(string()),
  isShiny: fallback(boolean(), false),
  isGuardian: fallback(boolean(), false),
  isFloating: fallback(boolean(), false),
  gender: fallback(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N')])), null),
  status: fallback(nullable(union([literal('par'), literal('brn'), literal('psn'), literal('slp'), literal('frz'), literal('tox')])), null),
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
  ivs: fallback(pokemonIVsSchema, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }),
  nature: fallback(string(), 'hardy'),
  heldItem: fallback(nullable(string()), null),
  item: fallback(nullable(string()), null),
  friendship: fallback(number(), 70),
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
  futureSightTurns: optional(number()),
  futureSightDmg: optional(number()),
  chargingMove: optional(nullable(moveSchema)),
  aura: optional(string()),
  isAncestral: optional(boolean()),
  choiceMove: optional(string()),
  form: optional(string()),
  originalForm: optional(nullable(unknown())),
  originalDitto: optional(nullable(unknown())),
});

// PokemonEgg validation schema
const pokemonEggSchema = object({
  uid: string(),
  id: string(),
  pokemonId: optional(string()),
  steps: fallback(number(), 0),
  totalSteps: optional(number()),
  ready: fallback(boolean(), false),
  isShiny: optional(boolean()),
  isGuardian: optional(boolean()),
  nature: optional(string()),
  abilitySlot: optional(number()),
  gender: fallback(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N')])), null),
  ivs: optional(pokemonIVsSchema),
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

// ActiveBattle enemy team member schema
const enemyPokemonSerializedSchema = object({
  uid: string(),
  id: string(),
  name: string(),
  emoji: string(),
  type: string(),
  level: number(),
  hp: number(),
  maxHp: number(),
  atk: number(),
  def: number(),
  spa: number(),
  spd: number(),
  spe: number(),
  moves: array(unknown()),
  status: nullable(string()),
  isShiny: boolean(),
  gender: nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N')])),
  ivs: record(string(), number()),
  nature: string(),
  ability: string(),
  exp: number(),
  expNeeded: number(),
  friendship: number(),
  _revealed: boolean(),
  _gymLeader: nullable(string()),
  _gymBadge: nullable(string()),
});

// ActiveBattle validation schema
const activeBattleSchema = object({
  isGym: boolean(),
  gymId: nullable(string()),
  isTrainer: boolean(),
  trainerName: nullable(string()),
  locationId: nullable(string()),
  enemyTeam: nullable(array(enemyPokemonSerializedSchema)),
  timestamp: number(),
  isPvP: optional(boolean()),
});

// Full SaveData validation schema
const saveDataSchema = object({
  trainer: string(),
  gender: fallback(union([literal('h'), literal('m')]), 'h'),
  badges: fallback(number(), 0),
  balls: fallback(number(), 0),
  money: fallback(number(), 0),
  battleCoins: fallback(number(), 0),
  eggs: optional(array(pokemonEggSchema)),
  trainerLevel: fallback(number(), 1),
  trainerExp: fallback(number(), 0),
  trainerExpNeeded: fallback(number(), 100),
  inventory: fallback(record(string(), number()), {}),
  team: optional(array(pokemonSchema)),
  box: optional(array(pokemonSchema)),
  pokedex: optional(array(string())),
  seenPokedex: optional(array(string())),
  defeatedGyms: optional(array(string())),
  gymProgress: fallback(record(string(), unknown()), {}),
  lastGymWins: fallback(record(string(), number()), {}),
  lastGymAttempts: fallback(record(string(), number()), {}),
  starterChosen: fallback(boolean(), false),
  lastRankedSeason: fallback(nullable(string()), null),
  nick_style: fallback(nullable(string()), null),
  avatar_style: fallback(nullable(string()), null),
  stats: fallback(record(string(), unknown()), {}),
  eloRating: fallback(number(), 1000),
  pvpStats: fallback(object({
    wins: fallback(number(), 0),
    losses: fallback(number(), 0),
    draws: fallback(number(), 0)
  }), { wins: 0, losses: 0, draws: 0 }),
  rankedMaxElo: fallback(number(), 1000),
  rankedRewardsClaimed: optional(array(string())),
  passiveTeamUids: optional(array(string())),
  passiveTeamActive: fallback(boolean(), false),
  activeBattle: fallback(nullable(activeBattleSchema), null),
  daycare_missions: optional(array(unknown())),
  daycare_mission_refreshes: fallback(number(), 3),
  safariTicketSecs: fallback(number(), 0),
  ceruleanTicketSecs: fallback(number(), 0),
  articunoTicketSecs: fallback(number(), 0),
  mewtwoTicketSecs: fallback(number(), 0),
  repelSecs: fallback(number(), 0),
  fishingRodSecs: fallback(number(), 0),
  fishingRodType: fallback(nullable(string()), null),
  pickaxeSecs: fallback(number(), 0),
  pickaxeType: fallback(nullable(string()), null),
  brushSecs: fallback(number(), 0),
  brushType: fallback(nullable(string()), null),
  shinyBoostSecs: fallback(number(), 0),
  amuletCoinSecs: fallback(number(), 0),
  luckyEggSecs: fallback(number(), 0),
  ivScannerSecs: fallback(number(), 0),
  incenseSecs: fallback(number(), 0),
  incenseType: fallback(nullable(string()), null),
  daycare_berry_egg_time: fallback(number(), 0),
  boxCount: fallback(number(), 4),
  chats: fallback(record(string(), unknown()), {}),
  playerClass: fallback(nullable(string()), null),
  classLevel: fallback(number(), 1),
  classXP: fallback(number(), 0),
  classData: fallback(object({
    captureStreak: fallback(number(), 0),
    longestStreak: fallback(number(), 0),
    reputation: fallback(number(), 0),
    blackMarketSales: fallback(number(), 0),
    criminality: fallback(number(), 0),
    blackMarketDaily: optional(object({
      date: string(),
      items: array(string()),
      purchased: array(string())
    })),
    activeMission: optional(unknown()),
    extortedRouteId: fallback(nullable(string()), null),
    extortedRouteTimestamp: fallback(nullable(string()), null),
    lastEggScanDate: fallback(nullable(string()), null),
    officialRouteId: fallback(nullable(string()), null),
    officialRouteTimestamp: fallback(nullable(string()), null),
    kitCaptures: fallback(number(), 0)
  }), {
    captureStreak: 0, longestStreak: 0, reputation: 0, blackMarketSales: 0, criminality: 0,
    extortedRouteId: null, extortedRouteTimestamp: null, lastEggScanDate: null, officialRouteId: null, officialRouteTimestamp: null, kitCaptures: 0
  }),
  faction: fallback(nullable(string()), null),
  warCoins: fallback(number(), 0),
  warCoinsSpent: fallback(number(), 0),
  warDailyCap: fallback(record(string(), record(string(), number())), {}),
  warDailyCoins: fallback(record(string(), number()), {}),
  warMyPtsLocal: fallback(record(string(), number()), {}),
  notificationHistory: fallback(array(unknown()), []),
  marketSoldSeenIds: fallback(array(string()), []),
  lastPokemonCenterHeal: fallback(number(), 0),
  playtime: fallback(number(), 0),
  _last_updated: optional(number())
});


/**
 * Validates full save state data against saveDataSchema.
 */
export function validateSaveData(data: unknown) {
  return safeParse(saveDataSchema, data);
}
