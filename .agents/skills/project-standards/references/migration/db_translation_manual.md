# Database Dialect Compatibility & Translation Manual

This manual provides detailed instructions on how the application translates PostgreSQL-specific migrations into SQLite-compliant syntax for offline use.

- **Theoretical Foundation**: See [postgreSQL_to_SQLite.md](./postgreSQL_to_SQLite.md) for an exhaustive technical report on architectural differences, mapping strategies, and performance considerations.

## Core Translation Rules

The `translatePostgresToSqlite` function in `sqliteEngine.ts` applies the following transformations:

### 1. Type Mapping

- **`JSONB`**, **`UUID`**, **`TIMESTAMPTZ`**, **`TIMESTAMP`** -> `TEXT` (SQLite handles these as strings).
- **`BIGINT`** -> `INTEGER`.
- **`BIGSERIAL PRIMARY KEY`** or **`SERIAL PRIMARY KEY`** -> `INTEGER PRIMARY KEY AUTOINCREMENT`.
- **`BIGSERIAL`** or **`SERIAL`** -> `INTEGER`.

### 2. Function Mapping

- **`NOW()`** -> `datetime('now')`.
- **`gen_random_uuid()`** -> `hex(randomblob(16))`.
- **Mandate**: Function-based `DEFAULT` values MUST be enclosed in parentheses (e.g., `DEFAULT (hex(randomblob(16)))`) for SQLite compatibility.
- **`jsonb_*`** -> `json_*` (General fallback: any function starting with `jsonb_` is mapped to its `json_` equivalent).
- **`jsonb_build_object`** -> `json_object`.
- **`jsonb_agg`** -> `json_group_array`.
- **`jsonb_object_agg`** -> `json_group_object`.
- **`jsonb_array_length`** -> `json_array_length`.
- **`jsonb_array_elements`** -> `json_each`.
- **`to_jsonb`** -> `json`.
- **`ARRAY_AGG`** -> `json_group_array`.
- **`string_agg`** -> `group_concat` (Fallback for SQLite versions < 3.44).
- **`EXTRACT(epoch FROM x)`** -> `unixepoch(x)`.
- **`SUBSTRING`** -> `SUBSTR`.

### 3. Boolean & Constant Mapping

- **`TRUE`** / **`FALSE`** -> `1` / `0` (SQLite lacks a native Boolean type).
- **`NULLS LAST`**: SQLite (since 3.30.0) supports `NULLS LAST` in `ORDER BY`. No translation needed for modern runtimes.

### 4. Cleanup & Optimization

- **`FOR UPDATE`**: Removed (SQLite locks globally).
- **`::type`**: Castings (e.g., `::TEXT`, `::BIGINT`, `::JSONB`) are removed.
- **`RAISE EXCEPTION`**: Suppressed (replaced with `SELECT 1`).
- **Reference Mapping**: `REFERENCES auth.users(id)` is mapped to `REFERENCES profiles(id)` for local integrity.

## Migration Parsing Logic

### Smart Splitting (`splitSQLStatements`)

SQL migration files are NOT split by simple semicolons. We use a parser that respects:

- **Comments**: Both line (`--`) and block (`/* ... */`) to prevent splitting at internal semicolons.
- **`$$` Blocks**: Essential for PL/pgSQL function bodies.
- **Single Quotes**: Prevents splitting inside string literals.

### Logic Skipping

The engine automatically skips blocks that cannot be translated to SQLite, such as:

- `CREATE OR REPLACE FUNCTION`
- `COMMENT ON`
- `CREATE POLICY` / `DROP POLICY`
- `CREATE TRIGGER` / `DROP TRIGGER`
- `CREATE EXTENSION`
- `ALTER PUBLICATION`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY`
- `GRANT` / `REVOKE` (PostgreSQL privilege definitions)
- `ALTER FUNCTION` (search path bindings, trigger parameter alters)

## Critical Limitations & Patterns

### 1. JSON Performance (O(N) vs O(1))

PostgreSQL's `JSONB` is a binary format with O(1) lookups. SQLite stores JSON as plain `TEXT`, meaning every operation (like `json_extract`) requires a full parse of the string (O(N)).

- **Mandate**: Avoid high-frequency JSON queries in tight loops in the offline engine. Favor dedicated columns for indexed data.

### 2. ALTER TABLE Mandate

SQLite's `ALTER TABLE` is extremely limited. It does NOT support:

- `ALTER COLUMN` (type change or constraint change).
- `DROP COLUMN` (in older versions).
- `ADD CONSTRAINT`.

**Required Pattern**: To perform these actions, you MUST use the **Table Recreation Pattern**:

1. `CREATE TABLE table_new (...)` with the new schema.
2. `INSERT INTO table_new SELECT * FROM table_old;`.
3. `DROP TABLE table_old;`.
4. `ALTER TABLE table_new RENAME TO table_old;`.

### 3. Procedural Logic (Triggers)

PostgreSQL triggers call external functions (`EXECUTE FUNCTION`). SQLite triggers MUST embed the entire logic inside `BEGIN ... END;` blocks and are restricted to simple DML (`INSERT`, `UPDATE`, `DELETE`).

- **Policy**: Complex business logic should be handled in the Javascript layer (`../../../../src/logic/db/dbRouter.ts`) rather than database triggers when targeting hybrid environments.

## Testing & Validation

All new SQL patterns MUST be added to the unit test suite in `../../../../tests/unit/db_translation.spec.ts`.
