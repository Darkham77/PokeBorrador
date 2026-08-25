/**
 * src/logic/validation/subschemas/socialSchemas.ts
 * 
 * Valibot validation schemas for GTS, Trades, Daycare Missions, Notifications, and Claims.
 */

import {
  object,
  string,
  number,
  boolean,
  pipe,
  minValue,
  union,
  record,
  optional,
  nullable,
  literal,
  unknown,
  type InferOutput,
} from 'valibot';

import { pokemonSchema } from './pokemonSchemas.ts';

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
    icon: optional(string()),
    money: optional(number()),
    exp: optional(number()),
    item: optional(string())
  })),
  completed: optional(boolean()),
  claimed: optional(boolean()),
  trainerType: optional(string()),
  trainerName: optional(string()),
  trainerSprite: optional(string()),
  dialogue: optional(string())
});

export const notificationItemSchema = object({
  id: optional(string()),
  title: optional(string()),
  message: optional(string()),
  type: optional(string()),
  timestamp: optional(number()),
  read: optional(boolean())
});

export const claimItemSchema = object({
  id: union([string(), number()]),
  user_id: optional(string()),
  type: optional(union([literal('pokemon'), literal('item'), literal('currency')])),
  asset_data: object({
    type: union([literal('pokemon'), literal('item'), literal('money'), literal('currency')]),
    data: unknown()
  }),
  source_type: string(),
  source_id: string(),
  created_at: string()
});

export type GtsListingDto = InferOutput<typeof gtsListingSchema>;
export type TradeOfferDto = InferOutput<typeof tradeOfferSchema>;
export type DaycareMissionDto = InferOutput<typeof daycareMissionSchema>;
export type ClaimItemDto = InferOutput<typeof claimItemSchema>;
