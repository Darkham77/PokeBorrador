# Database & Persistence Governance Rules

> **Scope & Authority**: This document governs **DBRouter online/offline context isolation, the Save Shield (0-Pokémon protection), prohibition on remote DB updates, static SQL migrations, and test fixture immutability** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For DBRouter query proxy architecture and Supabase RPC emulations ➔ See [DBRouter Manual](../technical/dbrouter_manual.md).
> - For save data schemas, encryption, and Valibot validation ➔ See [Save System Manual](../technical/save_system_manual.md).
> - For in-flight active combat reload (F5) and minigame exclusion ➔ See [Battle Persistence & Anti-Cheat Manual](../battle/battle_persistence_and_anti_cheat_manual.md).
> - For SQL dialect conversions (Postgres to SQLite) ➔ See [PostgreSQL to SQLite](../migration/postgreSQL_to_SQLite.md).

---

## 1. Context Isolation (DBRouter)

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.
- Run `npm run validate:sql` before committing database-related changes.

## 2. Zero-Pokemon Save Prohibition (Save Shield)

- To prevent data corruption or accidental reset overlays, it is STRICTLY FORBIDDEN to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`.
- A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.

## 3. Absolute Prohibition on Remote Database Updates & Build-First Mandate

- It is STRICTLY FORBIDDEN for any AI agent to execute, run, or trigger database update/migration scripts (e.g., `npm run servers:db:update server=<profile>`) against any remote, Docker-based, or shared database profile (including `server_franco`, `cloud`, or `official_prod`).
- Agents must NEVER touch or update remote/shared databases; database migrations are strictly reserved for manual execution by the USER.
- **Mandatory Build-First Workflow**: Agents must NEVER instruct or recommend the user to update a database (`npm run servers:db:update`) without FIRST having compiled the project (`npm run build`). Updating the database writes the new `app_version` and `db_version` to `system_config`, which will lock out and reject any client that has not been freshly built.

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

## 9. Monotonic Migration Timestamping & Immutable Ledger Mandate

- **Strict Monotonic Timestamping**: Every new database migration MUST use a unique timestamp prefix (`YYYYMMDDHHmmss`) strictly greater than all previous migration IDs in `database/migrations/` and remote `_migrations`.
- **Immutable Migration Runner Protection**: Migration runners treat `_migrations` as an immutable append-only ledger. Reusing or re-running an existing timestamp identifier is strictly prohibited because the runner will automatically skip it. Any schema or data fix iteration MUST increment to a fresh monotonic timestamp.
- **Build-First & Synchronized Generation**: Any database migration update MUST be accompanied by `npm run migrations:generate` and `npm run build` to ensure absolute synchronization between `src/logic/db/migrations_data.ts`, `public/version.json`, and database `system_config` values (`db_version` and `app_version`).

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

- **Client-Server Version Lock Interlock**: When `npm run servers:db:update` updates `app_version` and `db_version` on a remote server, the production hosting environment (GitHub Pages, Docker, Vercel) MUST receive the matching compiled client build (via commit & push) so that web clients do not get blocked by `VersionLockOverlay` or `OUTDATED_CLIENT` warnings.
- **Service Worker / PWA Invalidation**: If the browser displays an `OUTDATED_CLIENT` banner or cache mismatch, performing a Hard Refresh (`Ctrl + F5`) or clicking the in-game PWA "Actualizar" action will reload the Service Worker cache to match the new bundle.


