# Database & Persistence Governance Rules

> **Scope & Authority**: This document governs **DBRouter online/offline context isolation, the Save Shield (0-Pokémon protection), prohibition on remote DB updates, static SQL migrations, and test fixture immutability** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For DBRouter query proxy architecture and Supabase RPC emulations ➔ See [DBRouter Manual](../technical/dbrouter_manual.md).
> - For save data schemas, encryption, and Valibot validation ➔ See [Save System Manual](../technical/save_system_manual.md).
> - For in-flight active combat reload (F5) and minigame exclusion ➔ See [Battle Persistence & Anti-Cheat Manual](../battle/battle_persistence_and_anti_cheat_manual.md).
> - For SQL dialect conversions (Postgres to SQLite) ➔ See [Database Dialect Translation](../technical/db_translation_manual.md).

---

## 1. Context Isolation (DBRouter)

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.
- Run `npm run validate:sql` before committing database-related changes.

## 2. Zero-Pokemon Save Prohibition (Save Shield)

- To prevent data corruption or accidental reset overlays, it is STRICTLY FORBIDDEN to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`.
- A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.

## 3. Absolute Prohibition on Remote Database Updates & Safe Commit Mandate

- It is STRICTLY FORBIDDEN for any AI agent to execute, run, or trigger database update/migration scripts (e.g., `npm run database:update server=<profile>`) against any remote, Docker-based, or shared database profile (including `server_franco`, `cloud`, or `official_prod`).
- Agents must NEVER touch or update remote/shared databases; database migrations are strictly reserved for manual execution by the USER.
- **Safe Version Synchronization Workflow**: Agents must NEVER instruct or recommend the user to update a database (`npm run database:update`) with an uncommitted local build (`npm run build`), as this creates a local `public/version.json` that mismatches the version deployed on GitHub Pages/hosting. Version synchronization between code, database, and client deployments MUST always be managed through the official `/safe-commit` workflow.

## 4. Simulator Parity & Nickname Constraints

- **UID-Based Nicknames**: Showdown natively truncates nicknames to 18 characters. To prevent destructive truncation when mapping UIDs, team initialization in the simulator MUST use the first 8 characters of the UID (`uid.split('-')[0]`) as the Showdown nickname (`name`).
- **UID Resolution**: All UID mappings and injections (`injectUidsIntoRequest`) and log resolutions (`getPoke`) MUST be strictly based on UID or UID prefix. Name or slot-index fallbacks are strictly prohibited.
- **Showdown Status Representation**: Any status clearance or assignment on a Showdown simulator Pokemon instance MUST use an empty string `''` to denote no status. Assigning `null` to `status` on simulator instances will cause internal simulator crashes. Client-side Vue store Pokémon representations may still use `null` to indicate no status.

## 5. Static Database Migrations Over Runtime Fallbacks

- **Zero Runtime Fallback Mandate**: All schema evolutions, missing field backfills, and data shape normalizations MUST be resolved statically via SQL migrations (`.sqlite.sql` and `.sql`) traversing all persisted user saves in `game_saves`. Runtime schema fallbacks (e.g. Valibot `fallback()`, dynamic ad-hoc object patching like `normalizeData`) are strictly prohibited.
- **Legacy Code Detection & User Notification**: If any legacy runtime data repair, ad-hoc fallback, or normalization code is discovered in the application layer, the AI agent MUST immediately inform the user so it can be refactored into a static SQL migration.
- **Save Shield Validation Lock & Auto-Unlock**: When schema validation (Valibot) detects corrupted or non-compliant save data during login or runtime, the account MUST enter an error state locking state persistence (`saveBlocked = true`) to prevent corrupting database rows. The lock MUST automatically clear (`saveBlocked = false`) as soon as a subsequent application update or in-memory state re-validates cleanly against the canonical schema.

## 6. Test Fixture Immutability Mandate

- **100% Immutable Test Fixtures**: Static test fixtures and databases (e.g., `tests/fixtures/poke_local_ash.db`, `server_franco_backup_fixture.json`) MUST remain strictly read-only and immutable.
- **Isolated Ephemeral Execution**: Automated tests running migrations or updates MUST NEVER execute directly against fixture files on disk. Tests MUST instantiate ephemeral in-memory databases (`:memory:`) or duplicate the fixture to a temporary file (`os.tmpdir()`) with guaranteed cleanup in a `finally` block (`fs.unlinkSync`).

## 7. SQL Query Adapter Key Parity & Wasm Bind Safety

- **Strict Column Name Parity**: In database query proxies (`ProxyQuery`, `DBRouter`), JavaScript payload keys translate directly into SQL column identifiers. All database operations MUST use canonical `snake_case` keys matching the SQL schema. CamelCase keys are strictly forbidden in database table payloads.
- **Wasm SQLite Bind Parameter Normalization**: WebAssembly SQLite engines (`sql.js`) reject `undefined` parameter values. Query builders MUST sanitize all bind parameters, converting `undefined` to `null` before dispatching to SQLite.
- **Real-Schema Integration Testing**: Persistence synchronization helpers (`syncUserProfileData`, save handlers) MUST be verified with integration tests running against actual SQLite schemas (`DatabaseSync` / `:memory:`) to guarantee column parity.

## 8. Anti-Cheat Combat Persistence & Minigame Exclusion Protocol

- **In-Flight Combat Resumption Mandate**: Refreshing the browser (F5) during an active combat (wild, trainer, gym) MUST faithfully restore the battle at the exact turn, HP, stat stages, logs, and enemy UID. Reloading to re-roll enemies or escape combat without fleeing is strictly forbidden by the engine.
- **Strict Non-Persistence of Minigames**: Minigames (`minigame !== null`, e.g. Fishing, Archaeology) MUST NEVER be saved into `activeBattle` in persistent storage. If a player reloads during a minigame, the minigame is dropped immediately and the engine resumes the search loop on `/map` without awarding rewards or leaving stale modal state.

## 9. Monotonic Migration Timestamping, Immutable Ledger & Forward-Only Mandate

- **Strict Monotonic Timestamping**: Every new database migration MUST use a unique timestamp prefix (`YYYYMMDDHHmmss`) strictly greater than all previous migration IDs in `database/migrations/` and remote `_migrations`.
- **Default Immutability of Existing Migrations**: In normal operating flows, existing migration files in `database/migrations/` (`.sql` and `.sqlite.sql`) are immutable. All standard fixes, enhancements, or schema updates MUST be delivered as NEW forward-only migration files with incremented monotonic timestamps.
- **Rollback & Historical Data-Loss Exception**: Modifying a committed historical migration script is STRICTLY PROHIBITED except when resolving catastrophic data loss where the target database is actively rolled back to a prior checkpoint to replay the corrected migration series from scratch.
- **Immutable Migration Runner Protection**: Migration runners treat `_migrations` as an immutable append-only ledger. Reusing or re-running an existing timestamp identifier without a database rollback is strictly prohibited because the runner will automatically skip it.
- **Egg Data Contract Parity**: In `game_saves.save_data.eggs` (`PokemonEgg`), `id` is the canonical `PokemonSpeciesId` (e.g. `'charmander'`, `'togepi'`), and `uid` is the unique instance identifier. Migrations or scripts must never overwrite `egg.id` with arbitrary opaque identifiers (e.g. `'egg_...'`).
- **Synchronized Migration Generation**: Any database migration update MUST be accompanied by `npm run database:generate-migrations` and committed via `/safe-commit` to ensure absolute synchronization between `src/logic/db/migrations_data.ts`, `public/version.json`, and database `system_config` values (`db_version` and `app_version`).

## 10. PostgreSQL JSONB Unwrapping & Double-Encoding Protection Mandate

- **Safe JSONB String Unwrapping**: When inspecting or updating `game_saves.save_data` in PostgreSQL PL/pgSQL migrations, scripts MUST NEVER assume `save_data` is always stored as a native object. Because legacy clients or stringified payloads may store JSON as a serialized string scalar within the `JSONB` column (`jsonb_typeof(save_data) = 'string'`), all migration loops MUST include safe unwrap logic:
  ```sql
  IF jsonb_typeof(v_save_data) = 'string' THEN
    BEGIN
      v_save_data := (v_save_data #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END IF;
  ```
- **Normalization on Save**: When saving back with `UPDATE public.game_saves SET save_data = v_save_data, last_save_id = gen_random_uuid()`, the column is permanently normalized to a true JSONB object.

## 11. Production Web Bundle & DB Update Deployment Synchronization

- **Client-Server Version Lock Interlock**: When `npm run database:update` updates `app_version` and `db_version` on a remote server, the production hosting environment (GitHub Pages, Docker, Vercel) MUST receive the matching compiled client build (via commit & push) so that web clients do not get blocked by `VersionLockOverlay` or `OUTDATED_CLIENT` warnings.
- **Service Worker / PWA Invalidation**: If the browser displays an `OUTDATED_CLIENT` banner or cache mismatch, performing a Hard Refresh (`Ctrl + F5`) or clicking the in-game PWA "Actualizar" action will reload the Service Worker cache to match the new bundle.

## 12. Legacy Backup Upgrade & Migration Array Protection

- **Mandatory Backup Upgrade Pre-Restore Protocol**: Never restore legacy database backup files directly into newer database schemas. Always execute `npm run database:upgrade-backup file=<path>` to apply all subsequent migrations in memory, normalize Pokémon legality and vigor, and generate an upgraded backup JSON prior to executing `npm run database:restore`.
- **Prohibition on Positional Array Mutators in SQL**: Database migrations updating serialized JSON fields (`save_data`) MUST NOT use hardcoded array indices (`$.team[0].id`). All entity updates must be atomic per user save or match on canonical `uid` to prevent cross-account species corruption.

## 13. Offline Browser SQLite Import Protocol (Local DB Sync)

- **Purpose & Scope**: Enables executing Poké Vicio 100% offline in browser environments using genuine database state snapshots (accounts, Pokémon, items, friends, chat logs) for rapid QA, battle replay debugging, and offline development without requiring live Supabase credentials or network connections.
- **Mandatory Upgrade & Legality Pipeline**: JSON backups from remote servers MUST pass through `npm run database:upgrade-backup` before local conversion. The upgrade process executes all pending static SQL migrations and runs the automated Pokémon and account legality repair routine (`repairAccountsInSqlite`) across 100% of stored entities (`team`, `box`, `eggs`, `daycareWarehouse`, `daycare.slotA/slotB`).
- **Identifier Sanitization & Local Remapping**: The local import tool (`npm run database:local-import file=<path_upgraded.json>`) MUST convert remote Supabase UUIDs to clean local identifiers (`local_<username>`), ensuring all foreign keys across `chat_messages` (both `senderId` and `type: 'private:local_<username>'`), `friendships`, `daycare_slots`, `eggs`, and `war_*` tables maintain 100% relational integrity.
- **Local Dev Server Freshness & OPFS Persistence**: The compiled database is written to `database/temp/manual_user_backup_import.db`. The Vite dev server middleware MUST serve fresh disk files over stale RAM buffers via `/api/dev-manual-import-*`. Upon loading, the client's SQLite engine (`sqliteEngine.ts`) persists it directly into OPFS (`pokevicio_sqlite_v2`) and purges all previous individual save caches via `purgeAllCachedSaves()`.
- **PostgREST Query Emulation Compatibility**: The SQLite query adapter (`SQLiteQueryBuilder`) MUST support PostgREST query syntax used by stores in local mode (e.g. `.or()` clauses for private chats and friendships, `.eq()`, `.order()`) to guarantee 1:1 runtime parity with online Supabase queries.

## 14. Database SSoT & Optimistic Concurrency Control (OCC) Protection

- **Database Precedence (SSoT)**: In both online (Supabase) and offline (SQLite) modes, the `game_saves` database row is the absolute Single Source of Truth. Local browser caches (OPFS / LocalStorage) are strictly offline fallbacks and must NEVER overwrite or take precedence over database records during load/login flows.
- **Rollback & Restore Protection via `last_save_id`**: Every game save row is protected by an optimistic concurrency lock (`last_save_id` UUID). If an admin restores a database backup or rolls back server state, any subsequent save attempt from an un-synchronized active client will fail with `OUT_OF_SYNC`, triggering `handleSaveRollback()` to force-reload the authoritative server state into memory, update local OPFS cache, and reload the browser window.

## 15. PostgreSQL RLS Public Read & GRANT Policy Contract for Global Tables

- **Public Configuration Tables RLS Mandate**: All database tables delivering global configurations, server metadata, or public market state (`events_config`, `system_config`, `ranked_rules_config`, `competition_results`, `market_listings`, `war_dominance`) that have RLS enabled MUST explicitly include:
  1. A permissive public SELECT policy: `CREATE POLICY "Public read ..." ON public.<table_name> FOR SELECT USING (true);`
  2. Explicit role grants: `GRANT SELECT ON public.<table_name> TO anon, authenticated, service_role;`
- **Silent PostgREST Empty-Set Prevention**: In PostgreSQL, enabling RLS without a matching SELECT policy blocks queries from anon/authenticated clients silently without throwing errors (returning `[]`). Because local browser SQLite does not evaluate RLS, migrations MUST be audited to guarantee identical query visibility in both online Supabase and offline SQLite modes.

## 16. Unified Database Command Standard & Dynamic Whitelist Derivation

- **NPM Database Script Prefix Standard (`database:*`)**: All CLI utilities and scripts managing database migrations, updates, backups, restores, or account repair in `package.json` MUST use the unified `database:` prefix (e.g. `database:update`, `database:backup`, `database:restore`, `database:upgrade-backup`, `database:local-import`, `database:admin`, `database:repair-account`, `database:diagnose-account`, `database:generate-migrations`).
- **Zero-Hardcoded Data in SQL Migrations**: SQL migrations that enforce domain constraints or sanitize invalid entities must be derived dynamically from TypeScript Domain-Type-First single sources of truth (`src/data/system/constants.ts`). Hardcoding raw string lists in SQL files is strictly forbidden.
- **Disabled Species & Eggs Purge Standard**: Database sanitization and account diagnostics must strictly detect and remove non-enabled species and eggs from player saves (`team`, `box`, `eggs`, `daycareWarehouse`) with zero runtime fallbacks, preserving local/offline testing through explicit opt-in flags (`allowUnreleased: true`).

## 17. Strict Simulation Database Isolation & Dedicated Manual Import Protocol

- **Absolute Segregation Mandate**: Test runners, fuzzer suites, Playwright E2E scenarios, and GTS simulations MUST NEVER write, export, read, or overwrite the real user storage database (`pokevicio_sqlite_v2`).
- **Dedicated Simulation Directory & Key Prefix**: All ephemeral test database snapshots MUST use keys starting with the `sim_` prefix and be saved strictly under `database/temp/simulations/sim_<key>.db`. The Vite dev server bridge MUST reject non-simulation keys and MUST NEVER fall back to user database files or default shared paths.
- **Dedicated Manual Backup Import File**: The local import pipeline (`npm run database:local-import`) MUST exclusively generate `database/temp/manual_user_backup_import.db`. The client SQLite engine (`sqliteEngine.ts`) in standard browser sessions MUST ONLY check `/api/dev-manual-import-*` and ignore all simulation bridge endpoints.

## 18. Separation of Concerns: SQL Migration Audits vs. Historical Save Validation

- **Fast Static SQL Auditing (`npm run audit`)**: The persistence auditor (`scripts/auditors/persistence/validate_sql_migrations.ts`) is strictly focused on lightweight static validation: SQLite dialect translation syntax, monotonic timestamp progression, and `db_version` synchronization in sub-second times.
- **Heavy Fixture & Save Data Integrity Testing (`npm run test`)**: End-to-end replay of all historical migrations over real player save fixtures (`server_franco_backup_fixture.json`), along with deep validation of Pokémon species, abilities, natures, held items, inventory catalogs, and Valibot schema conformance, MUST reside exclusively in automated Vitest integration tests (`tests/node/system/backup_migration_real.test.ts`) running in parallel worker pools.

