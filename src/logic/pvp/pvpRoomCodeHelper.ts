import type { PvpRoomCode } from '@/types/battle/pvp';

/**
 * 32-character unambiguous alphanumeric alphabet for Room Codes.
 * Excludes ambiguous glyphs: '0' (zero), 'O' (letter O), '1' (one), 'I' (letter I).
 */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' as const;
export const ROOM_CODE_LENGTH = 4 as const;

const ROOM_CODE_REGEX = /^[2-9A-HJ-NP-Z]{4}$/;

/**
 * Generates a random 4-character room code using the unambiguous alphabet.
 */
export function generateRoomCode(): PvpRoomCode {
  let result = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    result += ROOM_CODE_ALPHABET[randomIndex];
  }
  return result as PvpRoomCode;
}

/**
 * Validates whether a candidate string matches the 4-character room code format.
 */
export function isValidRoomCode(candidate: unknown): candidate is PvpRoomCode {
  if (typeof candidate !== 'string') return false;
  return ROOM_CODE_REGEX.test(candidate);
}

/**
 * Normalizes user input into uppercase trimmed room code candidate.
 */
export function formatRoomCode(input: string): string {
  if (!input) return '';
  return input.trim().toUpperCase();
}
