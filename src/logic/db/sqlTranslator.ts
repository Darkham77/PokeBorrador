/**
 * src/logic/db/sqlTranslator.ts
 * Unified SQL translation logic for Poké Vicio.
 * Used by both frontend (sqliteEngine.ts) and backend/tools (validate_sql_migrations.ts).
 */

/**
 * Splits SQL by semicolon, respecting $$ blocks and strings.
 */
export function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let inString = false;
  let inBlockComment = false;
  let inLineComment = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    // 1. Handle Line Comments (--)
    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      if (i === sql.length - 1) inLineComment = false; 
      continue;
    }
    
    // 2. Handle Block Comments (/* */)
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!inDollarQuote && !inString) {
      // Detect start of Line Comment
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        i++;
        continue;
      }
      // Detect start of Block Comment
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      
      if (char === '$' && nextChar === '$') {
        inDollarQuote = true;
        current += '$$';
        i++;
        continue;
      }
      if (char === "'") {
        inString = true;
        current += "'";
        continue;
      }
      if (char === ';') {
        if (current.trim()) statements.push(current.trim());
        current = '';
        continue;
      }
    } else if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        current += '$$';
        i++;
        continue;
      }
    } else if (inString) {
      if (char === "'" && sql[i-1] !== '\\') {
        inString = false;
        current += "'";
        continue;
      }
    }
    current += char;
  }
  
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 0);
}

/**
 * Translates common Postgres syntax to SQLite.
 */
export function translatePostgresToSqlite(sql: string): string {
  if (!sql) return '';
  const cleanSql = sql.trim();
  const upperSql = cleanSql.toUpperCase();
  
  // Logic Skipping for PostgreSQL-only constructs
  const skipPatterns = [
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
    'ALTER TABLE PROFILES ENABLE ROW LEVEL SECURITY'
  ];
  
  if (skipPatterns.some(pattern => upperSql.startsWith(pattern))) {
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
    .replace(/\bNOW\(\)/gi, "datetime('now')")
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
    .replace(/DEFAULT\s+datetime\('now'\)/gi, "DEFAULT (datetime('now'))")
    .replace(/DEFAULT\s+hex\(randomblob\(16\)\)/gi, "DEFAULT (hex(randomblob(16)))")
    .replace(/RAISE\s+EXCEPTION\s+'[^']*'/gi, 'SELECT 1')
    .replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN')
    // 5. References & Schemas
    .replace(/REFERENCES\s+auth\.users/gi, 'REFERENCES profiles')
    .trim();
}
