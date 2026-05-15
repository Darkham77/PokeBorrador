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
