// @ts-nocheck
/**
 * tests/unit/db_translation.spec.js
 * Verifies the PostgreSQL to SQLite translation logic.
 */
import { describe, it, expect } from 'vitest'
import { translatePostgresToSqlite, splitSQLStatements } from '@/logic/db/sqliteEngine'

describe('Database Translation Engine', () => {
  describe('translatePostgresToSqlite', () => {
    it('should translate basic types and casts', () => {
      const sql = "CREATE TABLE test (id UUID, data JSONB, created_at TIMESTAMPTZ, amount BIGINT, updated_at TIMESTAMP)";
      const result = translatePostgresToSqlite(sql);
      expect(result).toContain('id TEXT');
      expect(result).toContain('data TEXT');
      expect(result).toContain('created_at TEXT');
      expect(result).toContain('amount INTEGER');
      expect(result).toContain('updated_at TEXT');
    });

    it('should handle SERIAL and BIGSERIAL', () => {
      expect(translatePostgresToSqlite("id BIGSERIAL PRIMARY KEY")).toBe("id INTEGER PRIMARY KEY AUTOINCREMENT");
      expect(translatePostgresToSqlite("id SERIAL PRIMARY KEY")).toBe("id INTEGER PRIMARY KEY AUTOINCREMENT");
    });

    it('should remove Postgres-specific casts', () => {
      const sql = "SELECT (data->>'money')::BIGINT FROM users";
      const result = translatePostgresToSqlite(sql);
      expect(result).toBe("SELECT (data->>'money') FROM users");
    });

    it('should translate JSON functions', () => {
      expect(translatePostgresToSqlite("jsonb_build_object('a', 1)")).toBe("json_object('a', 1)");
      expect(translatePostgresToSqlite("jsonb_set(data, '{key}', 'value')")).toBe("json_set(data, '{key}', 'value')");
      expect(translatePostgresToSqlite("jsonb_agg(p)")).toBe("json_group_array(p)");
      expect(translatePostgresToSqlite("jsonb_array_elements(data)")).toBe("json_each(data)");
      expect(translatePostgresToSqlite("jsonb_array_length(data)")).toBe("json_array_length(data)");
      expect(translatePostgresToSqlite("to_jsonb(val)")).toBe("json(val)");
      expect(translatePostgresToSqlite("jsonb_insert(a, b, c)")).toBe("json_insert(a, b, c)");
    });

    it('should translate string functions', () => {
      expect(translatePostgresToSqlite("SUBSTRING(name FROM 1 FOR 3)")).toBe("SUBSTR(name FROM 1 FOR 3)");
    });

    it('should translate complex epoch and array functions', () => {
      expect(translatePostgresToSqlite("EXTRACT(epoch FROM created_at)")).toBe("unixepoch(created_at)");
      expect(translatePostgresToSqlite("ARRAY_AGG(id)")).toBe("json_group_array(id)");
      expect(translatePostgresToSqlite("string_agg(name, ',')")).toBe("group_concat(name, ',')");
    });

    it('should translate Boolean constants', () => {
      expect(translatePostgresToSqlite("INSERT INTO t (active) VALUES (TRUE)")).toBe("INSERT INTO t (active) VALUES (1)");
      expect(translatePostgresToSqlite("UPDATE t SET active = FALSE")).toBe("UPDATE t SET active = 0");
    });

    it('should preserve JSON operators (supported in SQLite 3.38+)', () => {
      const sql = "SELECT data->'name', data->>'age' FROM users";
      expect(translatePostgresToSqlite(sql)).toBe(sql);
    });

    it('should translate NOW() and UUID generation', () => {
      expect(translatePostgresToSqlite("DEFAULT NOW()")).toContain("DEFAULT (datetime('now'))");
      expect(translatePostgresToSqlite("gen_random_uuid()")).toContain("hex(randomblob(16))");
    });

    it('should remove FOR UPDATE locking', () => {
      expect(translatePostgresToSqlite("SELECT * FROM users FOR UPDATE")).toBe("SELECT * FROM users");
    });

    it('should suppress RAISE EXCEPTION', () => {
      expect(translatePostgresToSqlite("RAISE EXCEPTION 'Error message'")).toBe("SELECT 1");
    });

    it('should translate ADD COLUMN IF NOT EXISTS', () => {
      const sql = "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT";
      expect(translatePostgresToSqlite(sql)).toBe("ALTER TABLE users ADD COLUMN email TEXT");
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
      expect(statements.length).toBe(2);
      expect(statements[0]).toContain('CREATE FUNCTION');
      expect(statements[0]).toContain('END;');
      expect(statements[1]).toBe('SELECT 1');
    });

    it('should ignore semicolon inside strings', () => {
      const sql = "INSERT INTO t VALUES ('hello;world'); SELECT 2;";
      const statements = splitSQLStatements(sql);
      expect(statements.length).toBe(2);
      expect(statements[0]).toBe("INSERT INTO t VALUES ('hello;world')");
      expect(statements[1]).toBe("SELECT 2");
    });
  });
});
