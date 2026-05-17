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
});
