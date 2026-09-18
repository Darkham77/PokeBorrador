/**
 * src/logic/db/sqlTranslator.ts
 * Unified SQL translation logic for Poké Vicio.
 * Used by both frontend (sqliteEngine.ts) and backend/tools (validate_sql_migrations.ts).
 */

interface SqlParserContext {
  inDollarQuote: boolean;
  inString: boolean;
  inBlockComment: boolean;
  inLineComment: boolean;
  current: string;
  statements: string[];
}

function handleActiveComments(sql: string, i: number, ctx: SqlParserContext): number {
  if (ctx.inLineComment) {
    if (sql[i] === '\n' || i === sql.length - 1) {
      ctx.inLineComment = false;
    }
    return 1;
  }
  if (ctx.inBlockComment) {
    if (sql[i] === '*' && sql[i + 1] === '/') {
      ctx.inBlockComment = false;
      return 2;
    }
    return 1;
  }
  return 0;
}

function handleQuoteCharacters(sql: string, i: number, ctx: SqlParserContext): number {
  const char = sql[i];
  const nextChar = sql[i + 1];

  if (ctx.inDollarQuote) {
    if (char === '$' && nextChar === '$') {
      ctx.inDollarQuote = false;
      ctx.current += '$$';
      return 2;
    }
    ctx.current += char;
    return 1;
  }

  if (ctx.inString) {
    if (char === "'" && nextChar === "'") {
      ctx.current += "''";
      return 2;
    }
    if (char === "'" && sql[i - 1] !== '\\') {
      ctx.inString = false;
      ctx.current += "'";
      return 1;
    }
    ctx.current += char;
    return 1;
  }

  return 0;
}

function handleNormalTokens(sql: string, i: number, ctx: SqlParserContext): number {
  const char = sql[i];
  const nextChar = sql[i + 1];

  if (char === '-' && nextChar === '-') {
    ctx.inLineComment = true;
    return 2;
  }
  if (char === '/' && nextChar === '*') {
    ctx.inBlockComment = true;
    return 2;
  }
  if (char === '$' && nextChar === '$') {
    ctx.inDollarQuote = true;
    ctx.current += '$$';
    return 2;
  }
  if (char === "'") {
    ctx.inString = true;
    ctx.current += "'";
    return 1;
  }
  if (char === ';') {
    if (ctx.current.trim()) ctx.statements.push(ctx.current.trim());
    ctx.current = '';
    return 1;
  }

  ctx.current += char;
  return 1;
}

/**
 * Splits SQL by semicolon, respecting $$ blocks and strings.
 */
export function splitSQLStatements(sql: string): string[] {
  const ctx: SqlParserContext = {
    inDollarQuote: false,
    inString: false,
    inBlockComment: false,
    inLineComment: false,
    current: '',
    statements: []
  };

  let i = 0;
  while (i < sql.length) {
    const commentStep = handleActiveComments(sql, i, ctx);
    if (commentStep > 0) {
      i += commentStep;
      continue;
    }

    if (ctx.inDollarQuote || ctx.inString) {
      i += handleQuoteCharacters(sql, i, ctx);
      continue;
    }

    i += handleNormalTokens(sql, i, ctx);
  }

  if (ctx.current.trim()) ctx.statements.push(ctx.current.trim());
  return ctx.statements.filter(s => s.length > 0);
}

const SQL_SKIP_PATTERNS = [
  'CREATE FUNCTION',
  'CREATE OR REPLACE FUNCTION',
  'DROP FUNCTION',
  'DO $$',
  'CREATE POLICY',
  'DROP POLICY',
  'ALTER PUBLICATION',
  'COMMENT ON',
  'CREATE TRIGGER',
  'DROP TRIGGER',
  'CREATE EXTENSION',
  'REVOKE',
  'GRANT',
  'ALTER FUNCTION',
  'SELECT SETVAL'
] as const;

/**
 * Translates common Postgres syntax to SQLite.
 */
export function translatePostgresToSqlite(sql: string): string {
  if (!sql) return '';
  const cleanSql = sql.trim();
  const upperSql = cleanSql.toUpperCase(); // text-ok: UI text display localization string
  
  // Logic Skipping for PostgreSQL-only constructs
  if (SQL_SKIP_PATTERNS.some(pattern => upperSql.startsWith(pattern))) {
    return '';
  }

  if (upperSql.startsWith('ALTER TABLE') && (
    upperSql.includes('ENABLE ROW LEVEL SECURITY') ||
    upperSql.includes('FORCE ROW LEVEL SECURITY') ||
    upperSql.includes('REPLICA IDENTITY')
  )) {
    return '';
  }

  return cleanSql
    .replace(/public\./gi, '')
    // 1. Types & Casts
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bUUID\b/gi, 'TEXT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bTIMESTAMP\b/gi, 'TEXT')
    .replace(/\bBIGINT\b/gi, 'INTEGER')
    .replace(/\b(BIGSERIAL|SERIAL)\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\b(BIGSERIAL|SERIAL)\b/gi, 'INTEGER')
    .replace(/::[a-z0-9]+/gi, '')
    // 2. Functions
    .replace(/\bNOW\(\)/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')")
    .replace(/\bgen_random_uuid\(\)/gi, "hex(randomblob(16))")
    .replace(/\bEXTRACT\(epoch\s+FROM\s+([^)]+)\)/gi, "unixepoch($1)")
    .replace(/\bARRAY_AGG\b/gi, "json_group_array")
    .replace(/\bstring_agg\b/gi, "group_concat")
    .replace(/\bjsonb_build_object\b/gi, "json_object")
    .replace(/\bjsonb_set\b/gi, "json_set")
    .replace(/\bjsonb_agg\b/gi, "json_group_array")
    .replace(/\bjsonb_object_agg\b/gi, "json_group_object")
    .replace(/\bjsonb_build_array\b/gi, "json_array")
    .replace(/\bjsonb_array_elements\b/gi, "json_each")
    .replace(/\bjsonb_array_length\b/gi, "json_array_length")
    .replace(/\bto_jsonb\b/gi, "json")
    .replace(/\bjsonb_(\w+)\b/gi, "json_$1")
    .replace(/\bSUBSTRING\b/gi, "SUBSTR")
    // 3. Operators & Constants
    .replace(/\bTRUE\b/gi, '1')
    .replace(/\bFALSE\b/gi, '0')
    .replace(/->>/g, '->>')
    .replace(/->/g, '->')
    // 4. SQL Patterns
    .replace(/FOR\s+UPDATE/gi, '')
    .replace(/DEFAULT\s+strftime\('%Y-%m-%dT%H:%M:%SZ',\s*'now'\)/gi, "DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
    .replace(/DEFAULT\s+hex\(randomblob\(16\)\)/gi, "DEFAULT (hex(randomblob(16)))")
    .replace(/RAISE\s+EXCEPTION\s+'[^']*'/gi, 'SELECT 1')
    .replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN')
    // 5. References & Schemas
    .replace(/REFERENCES\s+auth\.users/gi, 'REFERENCES profiles')
    .trim();
}
