# Architectural Design & Concepts: DBRouter

The **DBRouter** is the core component of Pokémon Online's data architecture. Its purpose is to act as a unified abstraction layer that allows the game to function identically in both connected environments (Online/Global) and local environments (Offline/Local).

## 🎯 Philosophy & Objectives

1. **Transparent Parity**: The rest of the code should not know whether the database is Supabase or SQLite.
2. **Strict Isolation**: Ensuring that data from a Global session never mixes with a Local session.
3. **Decoupling**: Preventing UI components (Vue) from depending on specific database drivers.

---

## 🏗️ Dual Architecture

The DBRouter operates in two mutually exclusive modes, determined during the user's session initialization.

### 1. Online Mode (Global)

* **Provider**: Supabase (PostgreSQL + PostgREST).
* **Scope**: Persistent world shared with other players.
* **Technology**: Uses the official Supabase client for queries, RPCs, and Realtime.

### 2. Offline Mode (Local)

* **Provider**: SQLite (WASM) + IndexedDB.
* **Scope**: Private world processed entirely in the user's browser.
* **Technology**: Uses `sql.js` for the SQL engine and `IndexedDB` for binary `.sqlite` file persistence.

---

## 🖇️ ProxyQuery & API Parity

To ensure a local SQL database behaves exactly like a Supabase REST API, the DBRouter implements the **ProxyQuery** pattern.

### How it works?

When you call `DBRouter.from('table').select('*').eq('id', 1)`, an immediate instruction is not executed. Instead, a `ProxyQuery` instance is created that:

1. **Captures the chain**: Stores filters (`eq`, `neq`, `gt`, etc.) and the action (`select`, `upsert`, `update`, `delete`).
2. **Detects the mode**:
    * **If Online**: Translates the chain directly into Supabase client calls.
    * **If Offline**: Translates the chain into a **pure SQL** statement (e.g., `SELECT * FROM table WHERE id = ?`).
3. **Executes**: Returns an object with the standard `{ data, error }` format.

---

## 🔒 Session Isolation & Concurrency

The DBRouter is the guardian of the **"Last-In-Wins"** principle.

### Session Lock

* Each tab generates a unique `SessionID`.
* Upon start, the DBRouter updates the `current_session_id` column in the `profiles` table (Online).
* **Realtime Monitoring**: Listens for changes in that same column. If it detects that the ID in the database has changed, it means another tab or device has taken control.
* **Reaction**: Immediately disables write access for the local instance to prevent data corruption.

### Global vs Local Isolation

It is **strictly forbidden** for a local session to read data from the cloud or for an online session to save progress in the local database (except for non-critical UI configurations).

---

## 🛠️ Initialization Workflow

1. **AuthStore**: Determines the session mode during login (`authStore.sessionMode`).
2. **GameStore**: Instantiates the `DBRouter` using the detected mode.
3. **Components**: Access the database agnostically via modular imports:

    ```javascript
    import { DBRouter } from '@/logic/db/dbRouter';
    
    const { data } = await DBRouter.from('inventory').select('*');
    ```

---

## 📖 Quick Usage Guide

### Basic Queries

```javascript
// Fetch filtered data
const { data, error } = await DBRouter.from('pokemon')
  .select('nickname, level')
  .eq('trainer_id', myId)
  .order('level', { ascending: false });
```

### Write Operations

```javascript
// Automatic Upsert (Insert or Update)
await DBRouter.from('game_saves').upsert({
  user_id: user.id,
  save_data: currentData
});
```

### Remote Procedure Calls (RPC)

The DBRouter emulates Supabase RPC behavior locally through mock logic or specific SQL execution:

```javascript
const { data } = await DBRouter.rpc('fn_add_bonus_exp', { amount: 100 });
```

---

## 🧪 Testing & Isolated Environments

To ensure unit tests do not corrupt production or local save data, the `DBRouter` supports a **Test Mode**.

### Initialization Options

When initializing the router in a test environment (e.g., Vitest), use the following configuration:

```javascript
import { DBRouter } from '@/logic/db/dbRouter';

// Initialize in-memory for volatile tests
await DBRouter.init({ 
  mode: 'local', 
  inMemory: true 
});

// OR initialize with a specific test database name
await DBRouter.init({ 
  mode: 'local', 
  dbName: 'pokevicio_test_db' 
});
```

### Mandate

* **FORBIDDEN**: Running tests against the default `pokevicio_idb` or Supabase production.

* **REQUIRED**: Always use `inMemory: true` for pure logic tests.

---

## 🛠️ Schema & Migration Management

The project follows a strict **Triple Source of Truth** pattern to ensure absolute integrity between the production server, local databases, and the codebase.

### 1. Mandatory Triple Parity (Automated)

Every change to the database structure **MUST** be documented in two manual places and one automated place:

* **SQL Migration File**: Located in `database/migrations/` with the format `YYYYMMDDHHMMSS_description.sql`. This is the primary delta.
* **Automated Logic Sync**: The **Vite Migration Plugin** automatically reads the migration folder and synchronizes the local engine via `src/logic/db/migrations_data.js`. Manual editing of the migration array is **strictly forbidden**.
* **Absolute Schema File**: The corresponding file in `database/schemas/` MUST be updated to reflect the table's new absolute state.

### 2. Migration Workflow

* **Schemas (`database/schemas/`)**: Represent the **current and absolute** state of the tables. Mandatory for clean installs and architectural reference.
* **Migrations (`database/migrations/`)**: Represent the history of **deltas**. Mandatory for tracking changes and team deployments.
* **Transparency**: When proposing a migration, the AI or developer **MUST** show the user the exact SQL code block to be executed in Supabase.

---

## 📂 Key Files

## Security & Compatibility: Versioning

To ensure the client is compatible with the database schema, `DBRouter` provides a compatibility check.

### Client-DB Parity

1. **`CLIENT_DB_VERSION`**: A constant defined in `src/logic/db/dbRouter.js`.
2. **`system_config` / `config`**: Tables where the current database version is stored.

### Check Procedure

During app initialization (`App.vue`), the `checkDBCompatibility(router)` function is called:

* If **Client Version > DB Version**: The app triggers a blocking state (`OUTDATED_SERVER`).
* If **Client Version <= DB Version**: The app proceeds normally.

### Migration Version Mandate

Every migration SQL script **MUST** end with a command that sets the version to its own timestamp ID:

* **Supabase**:

  ```sql
  UPDATE public.system_config SET value = jsonb_build_object('db_version', '20260418120000') WHERE key = 'db_version';
  ```

* **SQLite**:

  ```sql
  UPDATE config SET value = '20260418120000' WHERE key = 'db_version';
  ```

> [!CAUTION]
> If you perform a breaking schema change, you **MUST** increment the `CLIENT_DB_VERSION` in `dbRouter.js` (using the migration's timestamp) and ensure the migration sets the database version accordingly.

## Relevant Files

* [src/logic/db/dbRouter.js](../../../../src/logic/db/dbRouter.js): Main class handling the routing.
* [src/logic/db/proxyQuery.js](../../../../src/logic/db/proxyQuery.js): Query builder and SQL translator.
* [src/logic/db/sqliteEngine.js](../../../../src/logic/db/sqliteEngine.js): Low-level engine for SQLite and IndexedDB persistence.
