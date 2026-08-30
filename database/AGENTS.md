# Purpose

Manage local/offline database schemas, seeds, and SQL migration logic.

## Ownership

Backend / Database Engineers.

## Local Contracts

- DBRouter coordination for local persistence.
- Zero Postgres PL/pgSQL constructs in local migrations.
- **Competition Entries Multi-Category Indexing**: The `competition_entries` schema MUST include a `category_id TEXT` column with a composite unique constraint `UNIQUE(event_id, category_id, player_id)` to allow players to register Pokémon across distinct sub-competitions within the same event.

## Work Guidance

- Client-side SQLite WASM engines do not support PG constructs (`CREATE FUNCTION`, `DROP FUNCTION`). The schema translator must intercept and strip these statements to keep migration files clean.
- Ensure all SQLite files are generated and tested locally before committing.
- Do not run heavy SQL tests on trivial modifications.
- **SQLite Expression Term Limits**: Avoid deep nested JSON subqueries (e.g., nested `json_set` and `json_group_array` over thousands of rows) in SQLite migration files, as they exceed SQLite's tree term/recursion depth limits. Prefer flat UPDATE operations using `replace()` on the raw text content grouped in batches of 50.
- **No Runtime Sanitization Patches**: It is strictly forbidden to implement runtime data patches, sanitizers, or adapters in application code (e.g. inside save loading or initialization hooks) to dynamically fix legacy identifiers or missing fields. All data structure updates, backfills, and identifier migrations MUST be executed exclusively via proper SQL database migration scripts (PostgreSQL and SQLite companion scripts). If legacy runtime fallback code is discovered, it MUST be reported to the user immediately for swift refactoring.
- **SQL Parity Validation**: Always run and validate dual-file migrations (`.sql` + `.sqlite.sql`) using native SQLite engines before database commits (e.g., via `npm run validate:sql`).
- **Database Migrations Integrity**: Migration SQL scripts updating serialized JSON state must use valid Dex values (e.g., standard lowercase natures like `'hasty'`). Setting or re-introducing pseudo-states like `'active'` in nature columns is strictly prohibited. All seeded Pokémon species must strictly belong to `ENABLED_POKEMON_IDS`, and all seeded items must exist in `SHOP_ITEMS`.
- **Fetch Type Casting**: When passing raw binary exports (`Uint8Array`) as the request body in fetch calls (such as in local SQLite sync services), cast the payload using `binary as unknown as BodyInit` to satisfy compiler signature checks.
- **SQLite WASM RPC Emulation Protocol**: Because SQLite WASM lacks PL/pgSQL procedural execution engines, stored procedures executed in PostgreSQL (e.g. `claim_asset_v2`) MUST be emulated deterministically in TypeScript under `src/logic/db/rpcEmulations/`. All database schema and RPC evolutions MUST generate companion `.sql` (PostgreSQL) and `.sqlite.sql` (SQLite) migration files with synchronized timestamps and bumped `db_version`.
- **Immutable Migrations & Forward-Only Standard**: By default, existing migration files in `database/migrations/` (`.sql` and `.sqlite.sql`) are immutable permanent records. All standard fixes, data repairs, and schema evolutions MUST be delivered via brand-new forward-only SQL migration pairs.
- **Rollback & Historical Data-Loss Exception**: Editing an existing migration script is strictly forbidden UNLESS a past migration caused unrecoverable data loss/corruption and the system is undergoing an intentional database rollback to replay migrations from an earlier backup/checkpoint.
- **Monotonic Migration Timestamping & Immutable Ledger Mandate**:
  - All database migrations MUST use a strict monotonic timestamp format (`YYYYMMDDHHmmss_<description>.sql` and companion `.sqlite.sql`).
  - When creating or modifying migrations, agents MUST inspect existing migrations in `database/migrations/` and remote `_migrations` to ensure the timestamp is strictly greater than all previously registered versions ($t_i > t_{i-1}$).
  - Reusing an existing or previously executed timestamp is STRICTLY PROHIBITED in forward flows, as migration runners (`update_supabase_db.ts`) treat `_migrations` as an immutable append-only ledger and will skip execution without running the SQL patch.
  - The migration timestamp prefix MUST be 100% synchronized with the internal `INSERT INTO system_config (key, value) VALUES ('db_version', '<timestamp>'::jsonb)` statement across both PostgreSQL and companion SQLite files. `npm run validate:sql` strictly verifies this 1:1 synchronization.
  - Always run `npm run migrations:generate` and `npm run build` to synchronize in-memory migration definitions and client versioning before applying database updates.
- **Exhaustive Migration Integration Audit Mandate**: All migration integration and backup validation test suites (`backup_full_validation.test.ts`) MUST exhaustively audit 100% of serialized entities across every saved account (`team`, `box`, `eggs`, `daycareWarehouse`, `daycare.slotA/slotB`) against canonical Showdown Dex and domain type guards. Audits restricted only to `team` and `box` are strictly prohibited.
- **PostgreSQL Safe JSONB Unwrapping**: When manipulating `game_saves.save_data` in PostgreSQL migrations, scripts MUST check and unwrap serialized string values (`IF jsonb_typeof(v_save_data) = 'string' THEN v_save_data := (v_save_data #>> '{}')::jsonb; END IF;`) to prevent silent skips on legacy accounts.
- **No Positional Array Updates in SQL Migrations**: In SQL/PostgreSQL/SQLite migrations modifying serialized JSON/JSONB fields (`save_data`), it is strictly forbidden to use hardcoded or positional array indices (e.g. `$.team[0].id`, `$.box[15].id`) to modify specific entities. Such updates desynchronize species IDs from names and corrupt other player saves. Migrations MUST perform whole-save atomic updates or filter specifically by unique entity identifiers (`uid`).
- **Legacy Backup Upgrade Pre-Restoration Protocol**: Direct restoration of legacy JSON database backups into newer Supabase schemas with altered columns or constraints will fail. All legacy database backups MUST be upgraded to the latest schema version and Showdown legality via `npm run servers:db:upgrade-backup file=<path>` prior to running `npm run servers:db:restore`.
- **Client-Server Version Lock Interlock**: When remote databases are updated via `npm run servers:db:update`, the web client MUST be built and deployed so that production web bundles match the registered `app_version` and `db_version`. Hard refresh (`Ctrl + F5`) or PWA reload is required to bypass browser cache.

## Verification

- Run `npm run validate:sql` to verify database schemas against the SQLite local environment.

## Reference Manuals

- [dbrouter_manual.md](../.agents/skills/project-standards/references/technical/dbrouter_manual.md): Context routing boundaries between Online and Offline.
- [save_system_manual.md](../.agents/skills/project-standards/references/technical/save_system_manual.md): Game persistence configurations.

## Child DOX Index

- [backups/](./backups/AGENTS.md): Domain module documentation for backups.
- [migrations/](./migrations/AGENTS.md): Domain module documentation for migrations.
- [schemas/](./schemas/AGENTS.md): Domain module documentation for schemas.
