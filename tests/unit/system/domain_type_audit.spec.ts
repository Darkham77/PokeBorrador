/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

// Simulación de patrones regex de la auditoría de tipos de dominio
const P_TYPECAST_READONLY_STRING_ARRAY = /\bas\s+(?:readonly\s+)?string\[\]/g;
const P_TYPECAST_INLINE_DOMAIN_ID = /\bas\s+(?:[A-Z]\w*Id|keyof\s+typeof\s+[A-Z_a-z]\w*)\b/g;
const P_TYPECAST_RECORD_STRING = /\bas\s+Record\s*<\s*string\s*,/g;
const P_TYPECAST_ARRAY_ANY_UNKNOWN = /\bas\s+(?:any|unknown)\[\]/g;
const P_OBJECT_KEYS_CAST = /\bObject\.(?:keys|entries)\s*\([^)]+\)\s+as\s+(?:\([|\w\s]+\)|[A-Za-z]\w*)\[\]/g;

function isGuardFunctionLine(line: string): boolean {
  return /\bfunction\s+(?:is|require)[A-Z_a-z]\w*/.test(line) || /\bis[A-Z_a-z]\w*\s*=\s*/.test(line);
}

function testRegex(pattern: RegExp, input: string): boolean {
  const re = new RegExp(pattern.source, pattern.flags);
  return re.test(input);
}

describe('Domain Type Audit Pattern Recognition', () => {
  describe('P_TYPECAST_READONLY_STRING_ARRAY (Inclusion bypass cast)', () => {
    it('detects illegal array typecasts in business code', () => {
      const line = "if (!(REPLAY_SEATS as readonly string[]).includes(player))";
      expect(testRegex(P_TYPECAST_READONLY_STRING_ARRAY, line)).toBe(true);
      expect(isGuardFunctionLine(line)).toBe(false);
    });

    it('allows valid typecast inside an explicit isDomainId guard function', () => {
      const line = "export function isReplaySeat(seat: string): seat is ReplaySeat { return (REPLAY_SEATS as readonly string[]).includes(seat); }";
      expect(testRegex(P_TYPECAST_READONLY_STRING_ARRAY, line)).toBe(true);
      expect(isGuardFunctionLine(line)).toBe(true);
    });
  });

  describe('P_TYPECAST_INLINE_DOMAIN_ID (Inline domain assertion)', () => {
    it('detects illegal inline domain casts like "as GymId"', () => {
      const line = "const gymId = req.params.gym as GymId;";
      expect(testRegex(P_TYPECAST_INLINE_DOMAIN_ID, line)).toBe(true);
      expect(isGuardFunctionLine(line)).toBe(false);
      expect(line.includes('// domain-ok')).toBe(false);
    });

    it('detects inline cast to keyof typeof', () => {
      const line = "const species = rawName as keyof typeof POKEMON_DB;";
      expect(testRegex(P_TYPECAST_INLINE_DOMAIN_ID, line)).toBe(true);
    });

    it('allows inline cast when explicitly annotated with // domain-ok', () => {
      const line = "const externalTitle = payload.title as DisplayTitleId; // domain-ok";
      expect(line.includes('// domain-ok')).toBe(true);
    });
  });

  describe('P_TYPECAST_RECORD_STRING (Record<string, ...> cast)', () => {
    it('detects illegal cast to Record<string, ...>', () => {
      const line = "const value = (STORE_MAP as Record<string, Item>)[key];";
      expect(testRegex(P_TYPECAST_RECORD_STRING, line)).toBe(true);
      expect(line.includes('// open-record')).toBe(false);
    });

    it('allows cast when marked with // open-record escape hatch', () => {
      const line = "const rawMap = (data as Record<string, unknown>)[id]; // open-record";
      expect(line.includes('// open-record')).toBe(true);
    });
  });

  describe('P_TYPECAST_ARRAY_ANY_UNKNOWN (as any[] / as unknown[])', () => {
    it('detects array element type erasure with "as any[]"', () => {
      const line = "const list = (rawPayload as any[]).map(x => x.id);";
      expect(testRegex(P_TYPECAST_ARRAY_ANY_UNKNOWN, line)).toBe(true);
    });

    it('detects array element type erasure with "as unknown[]"', () => {
      const line = "const items = (data as unknown[]).filter(Boolean);";
      expect(testRegex(P_TYPECAST_ARRAY_ANY_UNKNOWN, line)).toBe(true);
    });
  });

  describe('P_OBJECT_KEYS_CAST (Object.keys(...) as DomainId[])', () => {
    it('detects Object.keys cast to domain array type', () => {
      const line = "const keys = Object.keys(WEATHER_REGISTRY) as WeatherId[];";
      expect(testRegex(P_OBJECT_KEYS_CAST, line)).toBe(true);
    });

    it('detects Object.entries cast', () => {
      const line = "const entries = Object.entries(ITEMS) as (keyof typeof ITEMS)[];";
      expect(testRegex(P_OBJECT_KEYS_CAST, line)).toBe(true);
    });
  });
});
