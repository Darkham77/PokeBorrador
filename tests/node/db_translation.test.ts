/**
 * tests/node/db_translation.test.ts
 * 
 * NATIVE NODE.JS TEST (Node.js 26+)
 * 
 * Verifies the PostgreSQL to SQLite translation logic using node:test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translatePostgresToSqlite, splitSQLStatements } from '../../src/logic/db/sqlTranslator.ts';

describe('Database Translation Engine (Native)', () => {
  describe('translatePostgresToSqlite', () => {
    it('should translate basic types and casts', () => {
      const sql = "CREATE TABLE test (id UUID, data JSONB, created_at TIMESTAMPTZ, amount BIGINT, updated_at TIMESTAMP)";
      const result = translatePostgresToSqlite(sql);
      assert.ok(result.includes('id TEXT'));
      assert.ok(result.includes('data TEXT'));
      assert.ok(result.includes('created_at TEXT'));
      assert.ok(result.includes('amount INTEGER'));
      assert.ok(result.includes('updated_at TEXT'));
    });

    it('should handle SERIAL and BIGSERIAL', () => {
      assert.strictEqual(translatePostgresToSqlite("id BIGSERIAL PRIMARY KEY"), "id INTEGER PRIMARY KEY AUTOINCREMENT");
      assert.strictEqual(translatePostgresToSqlite("id SERIAL PRIMARY KEY"), "id INTEGER PRIMARY KEY AUTOINCREMENT");
    });

    it('should remove Postgres-specific casts', () => {
      const sql = "SELECT (data->>'money')::BIGINT FROM users";
      const result = translatePostgresToSqlite(sql);
      assert.strictEqual(result, "SELECT (data->>'money') FROM users");
    });

    it('should translate JSON functions', () => {
      assert.strictEqual(translatePostgresToSqlite("jsonb_build_object('a', 1)"), "json_object('a', 1)");
      assert.strictEqual(translatePostgresToSqlite("jsonb_set(data, '{key}', 'value')"), "json_set(data, '{key}', 'value')");
      assert.strictEqual(translatePostgresToSqlite("jsonb_agg(p)"), "json_group_array(p)");
      assert.strictEqual(translatePostgresToSqlite("jsonb_array_elements(data)"), "json_each(data)");
      assert.strictEqual(translatePostgresToSqlite("jsonb_array_length(data)"), "json_array_length(data)");
      assert.strictEqual(translatePostgresToSqlite("to_jsonb(val)"), "json(val)");
      assert.strictEqual(translatePostgresToSqlite("jsonb_insert(a, b, c)"), "json_insert(a, b, c)");
    });

    it('should translate string functions', () => {
      assert.strictEqual(translatePostgresToSqlite("SUBSTRING(name FROM 1 FOR 3)"), "SUBSTR(name FROM 1 FOR 3)");
    });

    it('should translate complex epoch and array functions', () => {
      assert.strictEqual(translatePostgresToSqlite("EXTRACT(epoch FROM created_at)"), "unixepoch(created_at)");
      assert.strictEqual(translatePostgresToSqlite("ARRAY_AGG(id)"), "json_group_array(id)");
      assert.strictEqual(translatePostgresToSqlite("string_agg(name, ',')"), "group_concat(name, ',')");
    });

    it('should translate Boolean constants', () => {
      assert.strictEqual(translatePostgresToSqlite("INSERT INTO t (active) VALUES (TRUE)"), "INSERT INTO t (active) VALUES (1)");
      assert.strictEqual(translatePostgresToSqlite("UPDATE t SET active = FALSE"), "UPDATE t SET active = 0");
    });

    it('should translate NOW() and UUID generation', () => {
      assert.ok(translatePostgresToSqlite("DEFAULT NOW()").includes("(datetime('now'))"));
      assert.ok(translatePostgresToSqlite("gen_random_uuid()").includes("hex(randomblob(16))"));
    });

    it('should remove FOR UPDATE locking', () => {
      assert.strictEqual(translatePostgresToSqlite("SELECT * FROM users FOR UPDATE"), "SELECT * FROM users");
    });

    it('should suppress RAISE EXCEPTION', () => {
      assert.strictEqual(translatePostgresToSqlite("RAISE EXCEPTION 'Error message'"), "SELECT 1");
    });

    it('should translate ADD COLUMN IF NOT EXISTS', () => {
      const sql = "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT";
      assert.strictEqual(translatePostgresToSqlite(sql), "ALTER TABLE users ADD COLUMN email TEXT");
    });
  });

  describe('splitSQLStatements', () => {
    it('should split by semicolon but ignore inside $$ blocks', () => {
      const sql = `
        CREATE FUNCTION test() RETURNS void AS $$
        BEGIN
          INSERT INTO t VALUES (1);
          INSERT INTO t VALUES (2);
        END;
        $$ LANGUAGE plpgsql;
        SELECT 1;
      `;
      const statements = splitSQLStatements(sql);
      assert.strictEqual(statements.length, 2);
      assert.ok(statements[0].includes('CREATE FUNCTION'));
      assert.ok(statements[0].includes('END;'));
      assert.strictEqual(statements[1], 'SELECT 1');
    });

    it('should ignore semicolon inside strings', () => {
      const sql = "INSERT INTO t VALUES ('hello;world'); SELECT 2;";
      const statements = splitSQLStatements(sql);
      assert.strictEqual(statements.length, 2);
      assert.strictEqual(statements[0], "INSERT INTO t VALUES ('hello;world')");
      assert.strictEqual(statements[1], "SELECT 2");
    });
  });
});
