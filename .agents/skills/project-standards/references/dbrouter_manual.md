# Persistence and DBRouter Manual (Poké Vicio)

This manual documents the hybrid persistence architecture that enables Online (Supabase) and Offline (SQLite WASM) gameplay with total isolation.

## 🧱 DBRouter Architecture

### 1. Strict Isolation

The system **NEVER** writes to both databases simultaneously. The mode is determined at the beginning of the session (`online` or `offline`).

### 2. "Last-In-Wins" Logic

For Online mode, a `current_session_id` is used. If a change in this ID is detected from another client, the current session enters a conflict and is blocked to prevent data corruption by concurrent writes.

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
- **RPCs**: If you create an RPC on the server, you MUST create its equivalent or a mock in `dbRouter.js` so that offline mode does not break.
- **Transactions**: There are no guaranteed multi-table transactions in the router; always design logic to be atomic at the row level whenever possible.
