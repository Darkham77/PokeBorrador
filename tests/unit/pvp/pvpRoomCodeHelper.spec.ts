import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, formatRoomCode } from '@/logic/pvp/pvpRoomCodeHelper';

describe('pvpRoomCodeHelper', () => {
  describe('generateRoomCode', () => {
    it('generates a 4-character uppercase alphanumeric code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(4);
      expect(isValidRoomCode(code)).toBe(true);
    });

    it('never contains ambiguous characters like 0, O, 1, I', () => {
      const codes = Array.from({ length: 100 }, () => generateRoomCode());
      for (const code of codes) {
        expect(code).not.toMatch(/[0O1I]/);
        expect(isValidRoomCode(code)).toBe(true);
      }
    });
  });

  describe('isValidRoomCode', () => {
    it('accepts valid 4-character codes', () => {
      expect(isValidRoomCode('7ABC')).toBe(true);
      expect(isValidRoomCode('W9KZ')).toBe(true);
    });

    it('rejects invalid lengths or characters', () => {
      expect(isValidRoomCode('')).toBe(false);
      expect(isValidRoomCode('ABC')).toBe(false);
      expect(isValidRoomCode('ABCDE')).toBe(false);
      expect(isValidRoomCode('AB1C')).toBe(false); // contains '1'
      expect(isValidRoomCode('AB0C')).toBe(false); // contains '0'
      expect(isValidRoomCode('ABIC')).toBe(false); // contains 'I'
      expect(isValidRoomCode('ABOC')).toBe(false); // contains 'O'
      expect(isValidRoomCode('AB-C')).toBe(false);
    });
  });

  describe('formatRoomCode', () => {
    it('normalizes input by trimming and uppercasing', () => {
      expect(formatRoomCode(' 7abc ')).toBe('7ABC');
    });
  });
});
