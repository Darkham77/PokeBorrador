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
  safeParse, 
  union,
  array,
  record,
  optional,
  nullable,
  literal,
  boolean,
  unknown,
  type InferOutput,
  type InferInput
} from 'valibot';

import { pokemonSchema, pokemonEggSchema } from './subschemas/pokemonSchemas.ts';
import { activeBattleSchema } from './subschemas/battleSchemas.ts';
import { daycareMissionSchema, claimItemSchema, notificationItemSchema, tradeOfferSchema, gtsListingSchema } from './subschemas/socialSchemas.ts';
import {
  userProfileSchema,
  trainerNameSchema,
  authLoginSchema,
  authRegisterSchema,
  authPasswordResetSchema,
  chatMessageSchema,
  networkActionSchema
} from './subschemas/authSchemas.ts';

// Re-export all subschemas and DTO types
export * from './subschemas/authSchemas.ts';
export * from './subschemas/pokemonSchemas.ts';
export * from './subschemas/battleSchemas.ts';
export * from './subschemas/socialSchemas.ts';

// ==========================================
// SAVE DATA SCHEMAS
// ==========================================

export const saveDataSchema = object({
  trainer: string(),
  gender: optional(union([literal('h'), literal('m')])),
  last_renamed_at: optional(nullable(string())),
  badges: number(),
  balls: number(),
  money: number(),
  battleCoins: number(),
  eggs: optional(array(pokemonEggSchema)),
  trainerLevel: number(),
  trainerExp: number(),
  trainerExpNeeded: number(),
  trainerChance: optional(number()),
  inventory: record(string(), number()),
  map: optional(object({
    currentMap: string(),
    region: string(),
    lastNavigateAt: number()
  })),
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
  guardianCaptures: optional(record(string(), string())),
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
  daycareWarehouse: optional(array(unknown())),
  boxCount: number(),
  chats: optional(record(string(), unknown())),
  playerClass: optional(nullable(union([literal('cazabichos'), literal('criador'), literal('rocket'), literal('entrenador')]))),
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
  faction: optional(nullable(union([literal('union'), literal('poder')]))),
  warCoins: number(),
  warCoinsSpent: number(),
  warDailyCap: optional(record(string(), record(string(), optional(number())))),
  warDailyCoins: optional(record(string(), optional(number()))),
  warMyPtsLocal: optional(record(string(), number())),
  warPointsAccumulator: optional(number()),
  lastResolvedWeek: optional(nullable(string())),
  claimQueue: optional(array(claimItemSchema)),
  pvpTeam: optional(array(string())),
  warTeam: optional(array(string())),
  warSlots: optional(number()),
  notificationHistory: optional(array(union([notificationItemSchema, string(), record(string(), unknown())]))),
  marketSoldSeenIds: optional(array(string())),
  lastPokemonCenterHeal: number(),
  playtime: number(),
  lastSeen: optional(union([number(), string()])),
  _last_updated: optional(number())
});

// ==========================================
// VALIDATION HELPER FUNCTIONS
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

export type SaveDataDto = InferOutput<typeof saveDataSchema>;
export type SaveDataInputDto = InferInput<typeof saveDataSchema>;
