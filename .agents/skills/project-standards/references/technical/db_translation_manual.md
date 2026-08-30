# Database Dialect Compatibility & Translation Manual

> **Scope & Authority**: This manual governs the automated translation of PostgreSQL migrations into SQLite-compliant syntax for offline WASM execution (`sqliteEngine.ts`), ensuring dialect compatibility and transactional integrity.
> **Sources of Truth**:
> - Persistence Rules: [`../rules/database_and_persistence.md`](../rules/database_and_persistence.md)
> - DBRouter Architecture: [`dbrouter_manual.md`](./dbrouter_manual.md)
> - Save System: [`save_system_manual.md`](./save_system_manual.md)

---

## 1. 🔄 PostgreSQL to SQLite Type Mapping Matrix

SQLite uses dynamic type affinity with 5 storage classes (`NULL`, `INTEGER`, `REAL`, `TEXT`, `BLOB`). The translation pipeline maps PostgreSQL types as follows:

| PostgreSQL Data Type | SQLite Storage Affinity | Implementation & Translation Notes |
| :--- | :--- | :--- |
| **`SMALLINT`**, **`INT`**, **`INTEGER`** | `INTEGER` | Direct mapping; dynamic 1 to 8 bytes. |
| **`BIGINT`** | `INTEGER` | Handled natively up to 64-bit signed integers. |
| **`SERIAL PRIMARY KEY`** / **`BIGSERIAL PRIMARY KEY`** | `INTEGER PRIMARY KEY AUTOINCREMENT` | Strict syntactic replacement required for rowid sequence binding. |
| **`SERIAL`** / **`BIGSERIAL`** (non-PK) | `INTEGER` | Monotonic increment removed; handled by column defaults. |
| **`BOOLEAN`** | `INTEGER` | `TRUE` / `FALSE` literals translated to `1` / `0`. |
| **`NUMERIC`**, **`DECIMAL`**, **`REAL`**, **`DOUBLE PRECISION`** | `REAL` | Standard IEEE floating point representation. |
| **`VARCHAR(n)`**, **`CHAR(n)`**, **`TEXT`**, **`CITEXT`** | `TEXT` | Length constraints ignored; full variable length supported. |
| **`DATE`**, **`TIMESTAMP`**, **`TIMESTAMPTZ`** | `TEXT` | Persisted as ISO-8601 strings; functions mapped to `datetime('now')`. |
| **`JSON`**, **`JSONB`** | `TEXT` | Stored as plain text strings. Operations mapped to `json_*` / `json_extract`. |
| **`UUID`** | `TEXT` | Defaults mapped to `DEFAULT (hex(randomblob(16)))`. |
| **`BYTEA`**, **`BIT`**, **`BLOB`** | `BLOB` | Unstructured binary information. |

---

## 2. ⚙️ Function & Syntax Transformations

The `translatePostgresToSqlite` parser applies deterministic regex and token transformations:

### 1. Function Mapping
- **`NOW()`** $\rightarrow$ `datetime('now')`
- **`gen_random_uuid()`** $\rightarrow$ `hex(randomblob(16))` *(Mandate: function-based `DEFAULT` values MUST be enclosed in parentheses `DEFAULT (hex(randomblob(16)))`)*.
- **`jsonb_*`** $\rightarrow$ `json_*` (e.g., `jsonb_build_object` $\rightarrow$ `json_object`, `jsonb_agg` $\rightarrow$ `json_group_array`, `jsonb_array_elements` $\rightarrow$ `json_each`).
- **`to_jsonb`** $\rightarrow$ `json`
- **`ARRAY_AGG`** $\rightarrow$ `json_group_array`
- **`string_agg(col, delim)`** $\rightarrow$ `group_concat(col, delim)`
- **`EXTRACT(epoch FROM x)`** $\rightarrow$ `unixepoch(x)`
- **`SUBSTRING(x FROM a FOR b)`** $\rightarrow$ `SUBSTR(x, a, b)`

### 2. Casts and Cleanup
- **`::type` Casts**: PostgreSQL double-colon casts (`::TEXT`, `::BIGINT`, `::JSONB`) are stripped.
- **`FOR UPDATE`**: Stripped (SQLite locks at database/file level).
- **`RAISE EXCEPTION`**: Suppressed (replaced with `SELECT 1`).
- **Foreign Keys**: `REFERENCES auth.users(id)` is mapped to `REFERENCES profiles(id)`.

### 3. Logic Skipping
The offline engine automatically bypasses non-translatable server-side declarations:
- `CREATE OR REPLACE FUNCTION` / `ALTER FUNCTION`
- `COMMENT ON`
- `CREATE POLICY` / `DROP POLICY`
- `CREATE TRIGGER` / `DROP TRIGGER`
- `CREATE EXTENSION`
- `ALTER PUBLICATION`
- `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY`
- `GRANT` / `REVOKE`

---

## 3. 🏗️ Table Recreation Pattern (ALTER TABLE Invariant)

SQLite's `ALTER TABLE` is strictly limited (cannot alter column types, drop constraints, or modify primary keys directly). When a migration requires structural column mutations, it **MUST** execute the 10-step Table Recreation Pattern:

```sql
-- 1. Open transactional scope
BEGIN TRANSACTION;

-- 2. Temporarily disable foreign key checks
PRAGMA foreign_keys=OFF;

-- 3. Create replacement table with new target schema
CREATE TABLE table_new (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Copy existing data into new table
INSERT INTO table_new (id, name, created_at)
SELECT id, name, created_at FROM table_old;

-- 5. Drop original table
DROP TABLE table_old;

-- 6. Rename new table to original name
ALTER TABLE table_new RENAME TO table_old;

-- 7. Re-create indexes and triggers on the restored table
CREATE INDEX idx_table_name ON table_old(name);

-- 8. Run foreign key integrity check
PRAGMA foreign_key_check;

-- 9. Commit transaction
COMMIT;

-- 10. Re-enable foreign key constraints
PRAGMA foreign_keys=ON;
```

---

## 4. 🚀 Performance & Architectural Invariants

1. **JSON Performance ($O(1)$ vs $O(N)$)**:
   - PostgreSQL `JSONB` is binary ($O(1)$ lookup). SQLite stores JSON as plain `TEXT`, requiring a linear parse ($O(N)$) for `json_extract`.
   - **Mandate**: Avoid high-frequency JSON queries in hot paths; favor dedicated indexed columns.
2. **Standardized English Identifiers**:
   - All seed data (items, missions, arena rewards) in SQL migrations MUST use standard English IDs (`potion`, `quest_daily_01`). Never insert Spanish terms as primary keys.
3. **Unit Test Parity**:
   - All new SQL translation patterns MUST have unit tests added to `tests/unit/db_translation.spec.ts`.
