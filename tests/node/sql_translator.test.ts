import { test, describe } from 'node:test';
import assert from 'node:assert';
import { translatePostgresToSqlite } from '../../src/logic/db/sqlTranslator.ts';

describe('SQL Translator Logic (Native Node.js 26+ Test)', () => {
  test('should translate basic serial to integer primary key autoincrement', () => {
    const input = 'id SERIAL PRIMARY KEY';
    const output = translatePostgresToSqlite(input);
    assert.strictEqual(output, 'id INTEGER PRIMARY KEY AUTOINCREMENT');
  });

  test('should handle TIMESTAMPTZ conversion', () => {
    const input = 'created_at TIMESTAMPTZ DEFAULT NOW()';
    const output = translatePostgresToSqlite(input);
    assert.ok(output.includes('TEXT DEFAULT'));
    assert.ok(output.includes("datetime('now')"));
  });

  test('should skip PostgreSQL-only DROP FUNCTION statements', () => {
    const input = 'DROP FUNCTION IF EXISTS cancel_listing_v2(UUID)';
    const output = translatePostgresToSqlite(input);
    assert.strictEqual(output, '');
  });

  test('should skip PostgreSQL-only REVOKE, GRANT, and ALTER FUNCTION statements', () => {
    assert.strictEqual(translatePostgresToSqlite('REVOKE EXECUTE ON FUNCTION public.accept_trade_v2(uuid) FROM PUBLIC, anon;'), '');
    assert.strictEqual(translatePostgresToSqlite('GRANT EXECUTE ON FUNCTION public.accept_trade_v2(uuid) TO authenticated;'), '');
    assert.strictEqual(translatePostgresToSqlite('ALTER FUNCTION public.validate_game_save() SET search_path = public, pg_catalog;'), '');
  });

  test('should skip PostgreSQL-only RLS alter table statements', () => {
    assert.strictEqual(translatePostgresToSqlite('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), '');
    assert.strictEqual(translatePostgresToSqlite('ALTER TABLE public.game_saves FORCE ROW LEVEL SECURITY;'), '');
  });
});

