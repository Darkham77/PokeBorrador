/**
 * src/logic/validation/subschemas/authSchemas.ts
 * 
 * Valibot validation schemas for user profile, authentication and chat.
 */

import {
  object,
  string,
  number,
  boolean,
  pipe,
  minLength,
  maxLength,
  minValue,
  maxValue,
  union,
  nullish,
  record,
  optional,
  literal,
  trim,
  email,
  regex,
  type InferOutput,
} from 'valibot';

import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_TRAINER_LEVEL,
  MAX_TRAINER_LEVEL,
  MIN_TRAINER_NAME_LENGTH,
  MAX_TRAINER_NAME_LENGTH,
} from '@/logic/constants/gameplay.ts';

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

export type UserProfileDto = InferOutput<typeof userProfileSchema>;
export type TrainerNameDto = InferOutput<typeof trainerNameSchema>;
export type AuthLoginDto = InferOutput<typeof authLoginSchema>;
export type AuthRegisterDto = InferOutput<typeof authRegisterSchema>;
export type AuthPasswordResetDto = InferOutput<typeof authPasswordResetSchema>;
export type ChatMessageDto = InferOutput<typeof chatMessageSchema>;
export type NetworkActionDto = InferOutput<typeof networkActionSchema>;
