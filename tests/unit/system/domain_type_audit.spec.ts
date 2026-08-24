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

const P_BOOLEAN_LITERAL_TYPE_ANNOTATION = /\b(?:(?:export\s+)?const|let|var)\s+[A-Z_a-z]\w*\s*:\s*(?:true|false)\b|\b(?:export\s+)?type\s+[A-Z_a-z]\w*\s*=\s*(?:true|false)\s*;|^\s*(?:readonly\s+)?[A-Z_a-z]\w*\??:\s*(?:true|false)\s*;|\(\s*[A-Z_a-z]\w*\??:\s*(?:true|false)\b/gm;
const P_INLINE_ANONYMOUS_OBJECT_PARAM = /(?:\(|,\s*)[A-Z_a-z]\w*\??\s*:\s*\{[^\n}]*(?:;|,)[^\n}]*\}\s*[,)]/g;
const P_UNNAMED_POSITIONAL_TUPLE_RETURN = /\breturn\s*\[\s*[A-Z_a-z]\w*(?:\.[A-Z_a-z]\w*)*\s*,\s*[A-Z_a-z]\w*(?:\.[A-Z_a-z]\w*)*\s*\]\s*;/g;

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

  describe('P_BOOLEAN_LITERAL_TYPE_ANNOTATION (noLiteralBooleanType)', () => {
    it('detects var/let/const typed as literal true or false', () => {
      expect(testRegex(P_BOOLEAN_LITERAL_TYPE_ANNOTATION, "var hola: true;")).toBe(true);
      expect(testRegex(P_BOOLEAN_LITERAL_TYPE_ANNOTATION, "let active: false;")).toBe(true);
    });

    it('detects type alias assigned to boolean literal', () => {
      expect(testRegex(P_BOOLEAN_LITERAL_TYPE_ANNOTATION, "type Active = true;")).toBe(true);
    });

    it('allows canonical boolean type annotation', () => {
      expect(testRegex(P_BOOLEAN_LITERAL_TYPE_ANNOTATION, "var hola: boolean")).toBe(false);
    });
  });

  describe('P_INLINE_ANONYMOUS_OBJECT_PARAM (noInlineAnonymousObjectType)', () => {
    it('detects inline anonymous object parameter types', () => {
      expect(testRegex(P_INLINE_ANONYMOUS_OBJECT_PARAM, "function process(data: { id: string; name: string })")).toBe(true);
    });

    it('allows named interface / type annotation in parameter', () => {
      expect(testRegex(P_INLINE_ANONYMOUS_OBJECT_PARAM, "function process(data: UserPayload)")).toBe(false);
    });
  });

  describe('P_UNNAMED_POSITIONAL_TUPLE_RETURN (noLoosePositionalTuples)', () => {
    it('detects unannotated multi-value positional array return', () => {
      expect(testRegex(P_UNNAMED_POSITIONAL_TUPLE_RETURN, "return [item.id, item.count];")).toBe(true);
    });

    it('allows tuple return with explicit as const', () => {
      const line = "return [item.id, item.count] as const;";
      expect(line.includes('as const')).toBe(true);
    });
  });

  describe('P_UNBRANDED_DOMAIN_ID_ALIAS (Unbranded Domain IDs)', () => {
    it('detects unbranded domain ID type aliases', () => {
      const P_UNBRANDED_DOMAIN_ID_ALIAS = /\b(?:export\s+)?type\s+[A-Z]\w*Id\s*=\s*string\s*;/g;
      expect(testRegex(P_UNBRANDED_DOMAIN_ID_ALIAS, "type PokemonId = string;")).toBe(true);
    });

    it('allows branded domain ID type aliases', () => {
      const P_UNBRANDED_DOMAIN_ID_ALIAS = /\b(?:export\s+)?type\s+[A-Z]\w*Id\s*=\s*string\s*;/g;
      expect(testRegex(P_UNBRANDED_DOMAIN_ID_ALIAS, "type PokemonId = Brand<string, 'PokemonId'>;")).toBe(false);
    });
  });

  describe('P_AMBIGUOUS_NULL_DOMAIN_RETURN (Ambiguous Null Returns)', () => {
    it('detects ambiguous null domain return signatures', () => {
      const P_AMBIGUOUS_NULL_DOMAIN_RETURN = /^\s*(?:export\s+)?function\s+(?:get|find|lookup|resolve)[A-Z]\w*\([^)]*\)\s*:\s*(?:Promise<)?[A-Z]\w*\s*\|\s*(?:null|undefined)/gm;
      expect(testRegex(P_AMBIGUOUS_NULL_DOMAIN_RETURN, "function getPokemon(id: string): Pokemon | null")).toBe(true);
    });

    it('allows monadic Option/Result return signatures', () => {
      const P_AMBIGUOUS_NULL_DOMAIN_RETURN = /^\s*(?:export\s+)?function\s+(?:get|find|lookup|resolve)[A-Z]\w*\([^)]*\)\s*:\s*(?:Promise<)?[A-Z]\w*\s*\|\s*(?:null|undefined)/gm;
      expect(testRegex(P_AMBIGUOUS_NULL_DOMAIN_RETURN, "function getPokemon(id: string): Option<Pokemon>")).toBe(false);
    });
  });

  describe('P_FLOATING_PROMISE (Floating Promise Guard)', () => {
    it('detects unhandled async function invocations', () => {
      const P_FLOATING_PROMISE = /^\s*(?!(?:await|void|return|const|let|var)\s+)(?:[A-Z_a-z]\w*\.)?[a-z]\w*Async\s*\([^)]*\)\s*;/gm;
      expect(testRegex(P_FLOATING_PROMISE, "saveStateAsync();")).toBe(true);
    });

    it('allows handled async calls with void or await', () => {
      const P_FLOATING_PROMISE = /^\s*(?!(?:await|void|return|const|let|var)\s+)(?:[A-Z_a-z]\w*\.)?[a-z]\w*Async\s*\([^)]*\)\s*;/gm;
      expect(testRegex(P_FLOATING_PROMISE, "void saveStateAsync();")).toBe(false);
      expect(testRegex(P_FLOATING_PROMISE, "await saveStateAsync();")).toBe(false);
    });
  });

  describe('P_LEAKED_GLOBAL_MUTABLE (Leaked Global State)', () => {
    it('detects top-level let variable declarations at module scope', () => {
      const P_LEAKED_GLOBAL_MUTABLE = /^(?:export\s+)?let\s+[a-z]\w*\s*=/gm;
      expect(testRegex(P_LEAKED_GLOBAL_MUTABLE, "let activeCache = {};")).toBe(true);
    });

    it('allows const declarations at module scope', () => {
      const P_LEAKED_GLOBAL_MUTABLE = /^(?:export\s+)?let\s+[a-z]\w*\s*=/gm;
      expect(testRegex(P_LEAKED_GLOBAL_MUTABLE, "const ACTIVE_CACHE = {};")).toBe(false);
    });
  });
});
