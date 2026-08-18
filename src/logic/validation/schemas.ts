/**
 * src/logic/validation/schemas.ts
 * 
 * Lightweight, tree-shakable, zero-fallback validation schemas using Valibot.
 * Secures data boundaries at network, state, and local DB layers.
 * Follows strict Domain-Type-First governance and fail-fast validation.
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
  nullable,
  literal,
  trim,
  email,
  regex,
  unknown,
  type InferOutput,
  type InferInput
} from 'valibot';

import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_TRAINER_LEVEL,
  MAX_TRAINER_LEVEL,
  MIN_TRAINER_NAME_LENGTH,
  MAX_TRAINER_NAME_LENGTH,
  MAXIMUM_FRIENDSHIP_VALUE
} from '@/logic/constants/gameplay.ts';

// ==========================================
// 1. USER PROFILE & AUTH SCHEMAS
// ==========================================

export const userProfileSchema = object({
  id: string(),
  username: pipe(
    string(),
    trim(),
    minLength(MIN_USERNAME_LENGTH, `El nombre de usuario debe tener al menos ${MIN_USERNAME_LENGTH} caracteres`),
    maxLength(MAX_USERNAME_LENGTH, `El nombre de usuario no puede superar los ${MAX_USERNAME_LENGTH} caracteres`)
  ),
  level: pipe(
    number(),
    minValue(MIN_TRAINER_LEVEL, `El nivel debe ser al menos ${MIN_TRAINER_LEVEL}`),
    maxValue(MAX_TRAINER_LEVEL, `El nivel no puede superar ${MAX_TRAINER_LEVEL}`)
  ),
  is_banned: boolean(),
  coins: pipe(
    number(),
    minValue(0, 'Las monedas no pueden ser negativas')
  )
});

export const trainerNameSchema = pipe(
  string(),
  trim(),
  minLength(MIN_TRAINER_NAME_LENGTH, `El nombre debe tener al menos ${MIN_TRAINER_NAME_LENGTH} caracteres`),
  maxLength(MAX_TRAINER_NAME_LENGTH, `El nombre no puede superar los ${MAX_TRAINER_NAME_LENGTH} caracteres`)
);

export const authLoginSchema = object({
  email: pipe(
    string(),
    trim(),
    email('Formato de correo electrónico inválido')
  ),
  password: pipe(
    string(),
    minLength(6, 'La contraseña debe tener al menos 6 caracteres')
  )
});

export const authRegisterSchema = object({
  email: pipe(
    string(),
    trim(),
    email('Formato de correo electrónico inválido')
  ),
  password: pipe(
    string(),
    minLength(6, 'La contraseña debe tener al menos 6 caracteres')
  ),
  username: pipe(
    string(),
    trim(),
    minLength(MIN_USERNAME_LENGTH, `El nombre de usuario debe tener al menos ${MIN_USERNAME_LENGTH} caracteres`),
    maxLength(MAX_USERNAME_LENGTH, `El nombre de usuario no puede superar los ${MAX_USERNAME_LENGTH} caracteres`),
    regex(/^[a-zA-Z0-9_]+$/, 'El usuario solo puede contener caracteres alfanuméricos y guión bajo')
  ),
  gender: optional(union([literal('h'), literal('m')]))
});

export const authPasswordResetSchema = object({
  password: pipe(
    string(),
    minLength(6, 'La contraseña debe tener al menos 6 caracteres')
  ),
  confirmPassword: string()
});

// ==========================================
// 2. NETWORK & SOCIAL SCHEMAS
// ==========================================

export const chatMessageSchema = object({
  id: union([string(), number()]),
  user_id: string(),
  username: pipe(string(), trim(), minLength(1, 'El nombre no puede estar vacío')),
  message: pipe(string(), trim(), minLength(1, 'El mensaje no puede estar vacío')),
  player_class: nullish(string()),
  trainer_level: number(),
  created_at: nullish(string())
});

export const networkActionSchema = object({
  type: pipe(string(), minLength(1)),
  payload: record(string(), string()),
  timestamp: number()
});

// ==========================================
// 3. POKÉMON & COMBAT SCHEMAS (DOMAIN-FIRST)
// ==========================================

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
  isShiny: boolean(),
  isGuardian: optional(boolean()),
  isFloating: optional(boolean()),
  gender: optional(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N'), literal('')]))),
  status: optional(union([literal('par'), literal('brn'), literal('psn'), literal('slp'), literal('frz'), literal('tox'), literal('')])),
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
});

export const pokemonEggSchema = object({
  uid: string(),
  id: union([string(), number()]),
  pokemonId: optional(nullable(string())),
  steps: number(),
  totalSteps: optional(number()),
  ready: boolean(),
  isShiny: optional(boolean()),
  isGuardian: optional(boolean()),
  nature: optional(string()),
  abilitySlot: optional(number()),
  gender: optional(nullable(union([literal('m'), literal('f'), literal('M'), literal('F'), literal('N'), literal('')]))),
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

// ==========================================
// 4. GTS & TRADE SCHEMAS
// ==========================================

export const gtsItemDataSchema = object({
  id: union([string(), number()]),
  name: optional(string()),
  qty: pipe(number(), minValue(1, 'La cantidad debe ser al menos 1')),
});

const gtsPokemonListingSchema = object({
  id: string(),
  seller_name: optional(string()),
  seller_id: string(),
  price: pipe(number(), minValue(1, 'El precio debe ser al menos 1')),
  status: union([literal('active'), literal('sold'), literal('cancelled'), literal('expired')]),
  listing_type: literal('pokemon'),
  data: pokemonSchema,
  created_at: string()
});

const gtsItemListingSchema = object({
  id: string(),
  seller_name: optional(string()),
  seller_id: string(),
  price: pipe(number(), minValue(1, 'El precio debe ser al menos 1')),
  status: union([literal('active'), literal('sold'), literal('cancelled'), literal('expired')]),
  listing_type: literal('item'),
  data: gtsItemDataSchema,
  created_at: string()
});

export const gtsListingSchema = union([gtsPokemonListingSchema, gtsItemListingSchema]);

export const tradeOfferSchema = object({
  id: string(),
  sender_id: string(),
  receiver_id: string(),
  offer_pokemon: nullable(pokemonSchema),
  offer_items: record(string(), pipe(number(), minValue(1))),
  offer_money: pipe(number(), minValue(0)),
  request_pokemon: nullable(pokemonSchema),
  request_items: record(string(), pipe(number(), minValue(1))),
  request_money: pipe(number(), minValue(0)),
  message: string(),
  status: union([literal('pending'), literal('accepted'), literal('rejected'), literal('cancelled')]),
  created_at: string()
});

// ==========================================
// 5. SAVE DATA SCHEMAS
// ==========================================

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

export const activeBattleSchema = object({
  isGym: boolean(),
  gymId: nullable(string()),
  isTrainer: boolean(),
  trainerName: nullable(string()),
  locationId: nullable(string()),
  enemyTeam: nullable(array(enemyPokemonSerializedSchema)),
  timestamp: number(),
  isPvP: optional(boolean()),
});

export const daycareMissionSchema = object({
  date: optional(string()),
  targetId: optional(string()),
  requirement: optional(object({
    type: optional(string()),
    minLevel: optional(number()),
    minIvTotal: optional(number()),
    nature: optional(string()),
    stat31: optional(string())
  })),
  reqText: optional(string()),
  reward: optional(object({
    id: optional(string()),
    name: optional(string()),
    qty: optional(number()),
    money: optional(number()),
    exp: optional(number()),
    item: optional(string())
  })),
  completed: optional(boolean()),
  claimed: optional(boolean())
});

export const notificationItemSchema = object({
  id: optional(string()),
  title: optional(string()),
  message: optional(string()),
  type: optional(string()),
  timestamp: optional(number()),
  read: optional(boolean())
});

export const saveDataSchema = object({
  trainer: string(),
  gender: optional(union([literal('h'), literal('m')])),
  badges: number(),
  balls: number(),
  money: number(),
  battleCoins: number(),
  eggs: optional(array(pokemonEggSchema)),
  trainerLevel: number(),
  trainerExp: number(),
  trainerExpNeeded: number(),
  inventory: record(string(), number()),
  team: array(pokemonSchema),
  box: array(nullable(pokemonSchema)),
  pokedex: array(string()),
  seenPokedex: array(string()),
  defeatedGyms: array(string()),
  gymProgress: optional(record(string(), unknown())),
  lastGymWins: optional(record(string(), union([number(), string()]))),
  lastGymAttempts: optional(record(string(), union([number(), string()]))),
  starterChosen: boolean(),
  lastRankedSeason: optional(nullable(string())),
  nick_style: optional(nullable(string())),
  avatar_style: optional(nullable(string())),
  stats: optional(record(string(), unknown())),
  eloRating: number(),
  pvpStats: object({
    wins: number(),
    losses: number(),
    draws: number()
  }),
  rankedMaxElo: number(),
  rankedRewardsClaimed: optional(array(string())),
  passiveTeamUids: optional(array(string())),
  passiveTeamActive: boolean(),
  activeBattle: optional(nullable(activeBattleSchema)),
  daycare_missions: optional(array(daycareMissionSchema)),
  daycare_mission_refreshes: number(),
  safariTicketSecs: optional(number()),
  ceruleanTicketSecs: optional(number()),
  articunoTicketSecs: optional(number()),
  mewtwoTicketSecs: optional(number()),
  repelSecs: optional(number()),
  fishingRodSecs: optional(number()),
  fishingRodType: optional(nullable(string())),
  pickaxeSecs: optional(number()),
  pickaxeType: optional(nullable(string())),
  brushSecs: optional(number()),
  brushType: optional(nullable(string())),
  shinyBoostSecs: optional(number()),
  amuletCoinSecs: optional(number()),
  luckyEggSecs: optional(number()),
  ivScannerSecs: optional(number()),
  incenseSecs: optional(number()),
  incenseType: optional(nullable(string())),
  daycare_berry_egg_time: optional(number()),
  boxCount: number(),
  chats: optional(record(string(), unknown())),
  playerClass: optional(nullable(string())),
  classLevel: number(),
  classXP: number(),
  classData: object({
    captureStreak: number(),
    longestStreak: number(),
    reputation: number(),
    blackMarketSales: number(),
    criminality: number(),
    blackMarketDaily: optional(object({
      date: string(),
      items: array(string()),
      purchased: array(string())
    })),
    extortedRouteId: optional(nullable(string())),
    extortedRouteTimestamp: optional(nullable(string())),
    lastEggScanDate: optional(nullable(string())),
    officialRouteId: optional(nullable(string())),
    officialRouteTimestamp: optional(nullable(string())),
    kitCaptures: optional(number())
  }),
  faction: optional(nullable(string())),
  warCoins: number(),
  warCoinsSpent: number(),
  warDailyCap: optional(record(string(), record(string(), optional(number())))),
  warDailyCoins: optional(record(string(), optional(number()))),
  warMyPtsLocal: optional(record(string(), number())),
  notificationHistory: optional(array(union([notificationItemSchema, string(), record(string(), unknown())]))),
  marketSoldSeenIds: optional(array(string())),
  lastPokemonCenterHeal: number(),
  playtime: number(),
  _last_updated: optional(number())
});

// ==========================================
// 6. VALIDATION HELPER FUNCTIONS
// ==========================================

export function validateUserProfile(data: unknown) {
  return safeParse(userProfileSchema, data);
}

export function validateNetworkAction(data: unknown) {
  return safeParse(networkActionSchema, data);
}

export function validateTrainerName(data: unknown) {
  return safeParse(trainerNameSchema, data);
}

export function validateChatMessage(data: unknown) {
  return safeParse(chatMessageSchema, data);
}

export function validateTradeOffer(data: unknown) {
  return safeParse(tradeOfferSchema, data);
}

export function validateGtsListing(data: unknown) {
  return safeParse(gtsListingSchema, data);
}

export function validateAuthLogin(data: unknown) {
  return safeParse(authLoginSchema, data);
}

export function validateAuthRegister(data: unknown) {
  return safeParse(authRegisterSchema, data);
}

export function validateAuthPasswordReset(data: unknown) {
  return safeParse(authPasswordResetSchema, data);
}

export function validateSaveData(data: unknown) {
  return safeParse(saveDataSchema, data);
}

// ==========================================
// 7. INFERRED DTO TYPES (@/domain-type-first)
// ==========================================

export type UserProfileDto = InferOutput<typeof userProfileSchema>;
export type TrainerNameDto = InferOutput<typeof trainerNameSchema>;
export type AuthLoginDto = InferOutput<typeof authLoginSchema>;
export type AuthRegisterDto = InferOutput<typeof authRegisterSchema>;
export type AuthPasswordResetDto = InferOutput<typeof authPasswordResetSchema>;
export type ChatMessageDto = InferOutput<typeof chatMessageSchema>;
export type NetworkActionDto = InferOutput<typeof networkActionSchema>;
export type PokemonInstanceDto = InferOutput<typeof pokemonSchema>;
export type PokemonEggDto = InferOutput<typeof pokemonEggSchema>;
export type GtsListingDto = InferOutput<typeof gtsListingSchema>;
export type TradeOfferDto = InferOutput<typeof tradeOfferSchema>;
export type SaveDataDto = InferOutput<typeof saveDataSchema>;
export type SaveDataInputDto = InferInput<typeof saveDataSchema>;
