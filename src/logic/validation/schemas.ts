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
  type InferOutput 
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
export type UserProfileInput = InferOutput<typeof userProfileSchema>;
export type NetworkActionInput = InferOutput<typeof networkActionSchema>;
export type TrainerNameInput = InferOutput<typeof trainerNameSchema>;

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

export type ChatMessageInput = InferOutput<typeof chatMessageSchema>;

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

export type TradeOfferInput = InferOutput<typeof tradeOfferSchema>;

/**
 * Validates trade offer.
 */
export function validateTradeOffer(data: unknown) {
  return safeParse(tradeOfferSchema, data);
}
