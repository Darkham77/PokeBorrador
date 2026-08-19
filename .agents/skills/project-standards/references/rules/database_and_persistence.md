# Database & Persistence Governance

This document governs DBRouter isolation, save state shields, remote DB protection, and Showdown status parity across Poké Vicio.

## 1. Context Isolation (DBRouter)

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.
- Run `npm run validate:sql` before committing database-related changes.

## 2. Zero-Pokemon Save Prohibition (Save Shield)

- To prevent data corruption or accidental reset overlays, it is STRICTLY FORBIDDEN to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`.
- A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.

## 3. Absolute Prohibition on Remote Database Updates

- It is STRICTLY FORBIDDEN for any AI agent to execute, run, or trigger database update/migration scripts (e.g., `npm run servers:db:update`) against any remote, Docker-based, or shared database profile (including `server_franco`, `cloud`, or `official_prod`).
- Agents must NEVER touch or update remote/shared databases; database migrations are strictly reserved for manual execution by the USER.

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
