# Purpose

Manage local/offline database schemas, seeds, and SQL migration logic.

## Ownership

Backend / Database Engineers.

## Local Contracts

- DBRouter coordination for local persistence.
- Zero Postgres PL/pgSQL constructs in local migrations.
- **Multi-Engine Behavioral Parity & Dual-Database Testing Mandate**: All migrations, schema evolutions, constraints, query behaviors, and error triggers MUST behave 100% identically across SQLite and PostgreSQL. Any bug fix or feature touching database functionality MUST be covered by tests that execute and pass across both SQLite and PostgreSQL engines (via `describeWithDatabase` from `tests/dbTestHelper.ts` or dual-driver E2E runs).
- **Competition Entries Multi-Category Indexing**: The `competition_entries` schema MUST include a `category_id TEXT` column with a composite unique constraint `UNIQUE(event_id, category_id, player_id)` to allow players to register Pokémon across distinct sub-competitions within the same event.

## Work Guidance

- Client-side SQLite WASM engines do not support PG constructs (`CREATE FUNCTION`, `DROP FUNCTION`). The schema translator must intercept and strip these statements to keep migration files clean.
- Ensure all SQLite files are generated and tested locally before committing.
- Do not run heavy SQL tests on trivial modifications.
- **SQLite Expression Term Limits**: Avoid deep nested JSON subqueries (e.g., nested `json_set` and `json_group_array` over thousands of rows) in SQLite migration files, as they exceed SQLite's tree term/recursion depth limits. Prefer flat UPDATE operations using `replace()` on the raw text content grouped in batches of 50.
- **No Runtime Sanitization Patches**: It is strictly forbidden to implement runtime data patches, sanitizers, or adapters in application code (e.g. inside save loading or initialization hooks) to dynamically fix legacy identifiers or missing fields. All data structure updates, backfills, and identifier migrations MUST be executed exclusively via proper SQL database migration scripts (PostgreSQL and SQLite companion scripts). If legacy runtime fallback code is discovered, it MUST be reported to the user immediately for swift refactoring.
- **SQL Parity Validation**: Always run and validate dual-file migrations (`.sql` + `.sqlite.sql`) using native SQLite engines before database commits (e.g., via `npm run validate:sql`). Any database bug fix must verify identical behavioral parity across both SQLite and PostgreSQL.
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
  - Always run `npm run database:generate-migrations` and `npm run build` to synchronize in-memory migration definitions and client versioning before applying database updates.
- **Exhaustive Migration Integration Audit Mandate**: All migration integration and backup validation test suites (`backup_full_validation.test.ts`) MUST exhaustively audit 100% of serialized entities across every saved account (`team`, `box`, `eggs`, `daycareWarehouse`, `daycare.slotA/slotB`) against canonical Showdown Dex and domain type guards. Audits restricted only to `team` and `box` are strictly prohibited.
- **PostgreSQL Safe JSONB Unwrapping**: When manipulating `game_saves.save_data` in PostgreSQL migrations, scripts MUST check and unwrap serialized string values (`IF jsonb_typeof(v_save_data) = 'string' THEN v_save_data := (v_save_data #>> '{}')::jsonb; END IF;`) to prevent silent skips on legacy accounts.
- **No Positional Array Updates in SQL Migrations**: In SQL/PostgreSQL/SQLite migrations modifying serialized JSON/JSONB fields (`save_data`), it is strictly forbidden to use hardcoded or positional array indices (e.g. `$.team[0].id`, `$.box[15].id`) to modify specific entities. Such updates desynchronize species IDs from names and corrupt other player saves. Migrations MUST perform whole-save atomic updates or filter specifically by unique entity identifiers (`uid`).
- **Legacy Backup Upgrade Pre-Restoration Protocol**: Direct restoration of legacy JSON database backups into newer Supabase schemas with altered columns or constraints will fail. All legacy database backups MUST be upgraded to the latest schema version and Showdown legality via `npm run database:upgrade-backup file=<path>` prior to running `npm run database:restore`.
- **Offline Browser SQLite Import (Local DB Sync)**: Converting and importing upgraded backups into the local browser SQLite database (`database/temp/manual_user_backup_import.db` via `npm run database:local-import`) requires all remote Supabase UUIDs to be remapped to `local_<username>` across user rows, chats, friendships, and eggs, allowing 100% offline QA and battle testing with real accounts.
- **Simulation Isolation & Dedicated Manual Import File Contract**:
  - The offline browser SQLite import tool (`npm run database:local-import`) strictly outputs to `database/temp/manual_user_backup_import.db`.
  - Simulation and test suites are strictly forbidden from writing to or referencing `manual_user_backup_import.db`. All automated tests must use ephemeral in-memory databases or isolated files under `database/temp/simulations/`.
- **Mandatory Backup Upgrade Legality Repair**: The backup upgrade pipeline (`upgrade_backup.ts`) MUST execute the comprehensive account legality repair routine (`repairAccountsInSqlite`) on the in-memory SQLite database across 100% of persisted player saves (`team`, `box`, `eggs`, `daycareWarehouse`, `daycare.slotA/slotB`) after applying all SQL migrations and before exporting the final upgraded JSON backup.
- **Domain-Type-First Migration Derivation Mandate**: SQL migrations that filter, validate, or sanitize data against domain-specific whitelists (such as `ENABLED_POKEMON_IDS`, item catalogs, or move registries) MUST NEVER contain hardcoded literal arrays in SQL. They MUST be generated dynamically from canonical TypeScript constants via dedicated generation scripts (e.g. `scripts/database/generate_species_purge_migration.ts`) to ensure single source of truth integrity and prevent schema drift.
- **Unreleased Species & Eggs Purge Protocol**: Production migrations and repair scripts must unconditionally purge unreleased or non-enabled Pokémon species and eggs from `team`, `box`, `eggs`, and `daycareWarehouse`. The Save Shield mechanism MUST ensure that accounts whose active party was fully purged are rescued by promoting a legal box Pokémon or injecting a baseline legal starter (e.g. Bulbasaur Lv. 5).
- **PostgreSQL RLS Public Read & GRANT Policy Contract**:
  - Whenever enabling Row Level Security (`ENABLE ROW LEVEL SECURITY`) on static, public, or global configuration tables (`events_config`, `system_config`, `ranked_rules_config`, `competition_results`, `market_listings`, `war_dominance`), migrations MUST explicitly declare both a public SELECT policy (`CREATE POLICY "Public read ..." ON public.<table_name> FOR SELECT USING (true);`) AND explicit role permissions (`GRANT SELECT ON public.<table_name> TO anon, authenticated, service_role;`).
  - Without this policy, Supabase PostgREST silently returns an empty set (`[]`) to client queries while local SQLite (which lacks RLS) appears to succeed, causing hidden online desynchronizations.
- **PostgreSQL PL/pgSQL Loop Variable Declaration Mandate**:
  - Whenever defining or updating stored procedures / RPCs in PostgreSQL (`CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql`), all loop iteration variables used in range or row loops (e.g. `FOR i IN ...`, `FOR j IN ...`) MUST be explicitly declared in the `DECLARE` block (e.g. `i INT;`, `j INT;`).
  - Unlike some procedural environments, PostgreSQL PL/pgSQL requires explicit declaration for scalar loop counters. Omitting loop variable declarations causes runtime fatal errors (`record/variable "<var>" does not exist`), resulting in complete transaction rollbacks on live Supabase databases while offline TypeScript/SQLite RPC emulators pass silently.
- **Automated Competition Award Email Safety Mandate**:
  - Competition award functions (`fn_award_event_automated`) inserting rows into `public.awards` MUST safely aggregate and propagate `player_email` with `COALESCE(player_email, '')` directly in the ranking/aggregation step, preventing runtime `NOT NULL` constraint violations on `awards.winner_email`.
- **PL/pgSQL Variable Scope Hygiene Mandate**:
  - Stored procedures and triggers MUST use distinct, unambiguous prefixes (`v_*` for local variables, `p_*` for input parameters) to prevent name collisions and variable shadowing with existing column identifiers in SQL queries and nested execution blocks.
- **PostgreSQL JSON/JSONB Operator Coercion & Schema Typing Mandate**:
  - In PostgreSQL, JSON extraction and navigation operators (`->`, `->>`) exist strictly for `JSON` and `JSONB` data types, NOT `TEXT`.
  - When writing stored procedures / RPCs in PL/pgSQL that process JSON configurations or user payloads, procedures MUST NOT assume table columns are typed as `JSONB` if legacy migrations created them as `TEXT`.
  - Stored procedures MUST explicitly coerce incoming record fields (e.g. `v_config := (event_rec.config)::jsonb;`, `(data)::jsonb->>'field'`) and migrations must include defensive column alterations (`ALTER TABLE public.<table_name> ALTER COLUMN <col> TYPE JSONB USING <col>::jsonb;`) to prevent runtime fatal errors (`operator does not exist: text ->> unknown`).
- **Strict PostgreSQL RPC Execution Grants Mandate**:
  - Every `CREATE OR REPLACE FUNCTION` defined in PostgreSQL migrations MUST explicitly declare execution privileges (`GRANT EXECUTE ON FUNCTION public.<func_name>(<args>) TO authenticated, anon, service_role;`) and set a secure search path (`SET search_path = public, pg_catalog;`).
  - Without explicit `GRANT EXECUTE`, hardened database configurations and PostgREST will reject client RPC invocations with HTTP 403 / permission denied errors.

## Verification

- Run `npm run validate:sql` to verify database schemas against the SQLite local environment.

## Reference Manuals

- [dbrouter_manual.md](../.agents/skills/project-standards/references/technical/dbrouter_manual.md): Context routing boundaries between Online and Offline.
- [save_system_manual.md](../.agents/skills/project-standards/references/technical/save_system_manual.md): Game persistence configurations.

## Child DOX Index

- [backups/](./backups/AGENTS.md): Domain module documentation for backups.
- [migrations/](./migrations/AGENTS.md): Domain module documentation for migrations.
- [schemas/](./schemas/AGENTS.md): Domain module documentation for schemas.
