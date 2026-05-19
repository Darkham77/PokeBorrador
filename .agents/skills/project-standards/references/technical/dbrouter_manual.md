# Persistence and DBRouter Manual (Poké Vicio)

This manual documents the hybrid persistence architecture that enables Online (Supabase) and Offline (SQLite WASM) gameplay with total isolation.

## 🧱 DBRouter Architecture

### 1. Strict Isolation

The system **NEVER** writes to both databases simultaneously. The mode is determined at the beginning of the session (`online` or `offline`).

### 2. "Last-In-Wins" Logic

For Online mode, a `current_session_id` is used. If a change in this ID is detected from another client, the current session enters a conflict and is blocked to prevent data corruption by concurrent writes.

### 3. Autonomous Lazy Initialization

The `DBRouter` is the absolute owner of the Supabase client lifecycle.

- **Lazy Init**: The Supabase client is NEVER created on boot if the mode is `offline`. It is instantiated only when a cloud-dependent property (like `auth` or `rpc`) is accessed in `online` mode.
- **Autonomous Configuration**: The `supabase.ts` file only provides the config; the `DBRouter` imports `createClient` and manages the instance internally.
- **Silent Boot**: This architecture prevents "Tracking Prevention" warnings on `localhost` or local-first environments.
- **Dynamic Reconfiguration**: The `updateConfig({ url, key })` method allows switching between different official or local server instances in real-time without requiring a page reload or state reset.

---

## ⏳ Time Protocol and Simulation

### 1. getServerTime()

- **Online**: Obtains real time via an RPC to the server to prevent cheating with the local clock.
- **Offline**: Uses the local clock but allows the use of a **Time Offset**.

### 2. Time Mocking (Debug/Offline only)

Allows advancing or delaying the engine time to test:

- Day/Night cycles.
- Dynamic weather.
- Completion of IDLE missions.

---

## 🔄 Synchronization and Versions

### 1. CLIENT_DB_VERSION

- Calculated automatically based on the length of the `DATABASE_MIGRATIONS` array.
- The client **MUST NEVER** connect to a server whose DB version is lower than the client's version.

### 2. SQLite Persistence

In offline mode, changes are saved in memory and synchronized with the browser's file system using `persistSQLite()` at the end of each important operation (e.g., after catching a Pokémon).

---

## 🚨 Usage Rules for Developers

- **Do Not Use Supabase Directly**: Always use `gameStore.db` or the injected router.
- **RPCs**: If you create an RPC on the server, you MUST create its equivalent or a mock in `dbRouter.ts` so that offline mode does not break.
- **Transactions**: There are no guaranteed multi-table transactions in the router; always design logic to be atomic at the row level whenever possible.
- **Migration Integrity Patch**: To ensure `npm run validate:sql` passes in environments with inconsistent migration history, all new migrations MUST include `CREATE TABLE IF NOT EXISTS` blocks for the tables they affect. This prevents "no such table" errors during the isolated validation phase.
- **Unit Testing & Mocking**: When mocking `DBRouter` in unit tests, you MUST provide a dummy URL/Key to satisfy the configuration check and explicitly inject your mock client into the private `_realClient` property to prevent the lazy-initializer from attempting a real connection.

---

## 😈 Administrative Privilege Standards

### 1. Automatic Admin Status (Local Logic)

Admin status does not depend on the IP address (`localhost`), but rather on the **active login instance type** in the `DBRouter`.

- **Local/Offline Instances**: When using Guest login or Offline mode (SQLite), the system grants automatic administrative privileges (`isAdmin = true`). This allows for rapid testing of mechanics without database configuration.
- **Online/Cloud Instances (Supabase)**: In online mode, admin status is restricted. It is only granted if the user's profile in the database explicitly has the admin role or flag.

### 2. isLocal Detection

The router's `isLocal` property acts as the trigger for this privilege escalation in controlled environments.

```javascript
// Standard pattern for debug permission verification
const isAdmin = computed(() => profileStore.isAdmin || db.isLocal);
```

---

## 🏛️ SQL Compatibility (SQLite)

To ensure the local developer engine remains in parity with the production cloud engine:

- **Forbidden Syntax**: NEVER use the `CASCADE` keyword in `DROP TABLE` or `DROP VIEW` statements, as SQLite does not support it and will fail during migration validation (`npm run validate:sql`).
- **Idempotency**: Use `IF EXISTS` to prevent errors during re-runs of seed scripts.
- **Proxy Query Upsert/Insert Reusability**: In local SQLite WASM execution mode (`ProxyQuery`), `insert` queries can safely reuse `upsert` (`INSERT OR REPLACE`) logic to simplify offline query proxying while maintaining absolute compatibility with online PostgREST APIs.
- **Auto-Parsing Known JSON Fields**: When emulating Supabase queries locally via SQLite WASM, stringified JSON columns (`save_data`, `team_data`, `data`, `config`, `schedule`, `asset_data`) must be automatically parsed within `executeLocal` before returning results to ensure seamless data consumption by Pinia stores.

---

## 📥 Dev Database Import & Local Mapping

To streamline testing with production data without introducing UI inconsistencies or browser console pollution:

### 1. Dev Database Import Check

To prevent noisy HTTP 404 GET console errors during local development page refreshes, the client MUST query the check endpoint `/api/dev-import-db-check` first. If it returns `{ exists: true }`, only then does the engine fetch the full binary database from `/api/dev-import-db`.

### 2. Local Nickname Mappings

When converting online backups (Supabase JSON) to local SQLite format, user UUIDs MUST be translated to `local_<username>` (lowercase, spaces replaced by underscores) instead of email addresses. This preserves exact parity with the local/guest login username logic and ensures user saves load correctly. The original human-readable username must be preserved in the `profiles` table.
