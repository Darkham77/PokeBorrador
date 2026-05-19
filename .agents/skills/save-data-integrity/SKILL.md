---
name: save-data-integrity
description: Ensures the integrity of save data. Delegates technical rules to the `@/project-standards/references/save_system_manual.md` manual.
---

# Skill: Save Integrity

> [!IMPORTANT] Any change in Pinia Stores or persistence logic MUST follow the rules in the [Save System Manual](../project-standards/references/save_system_manual.md).

## Skill Focus

- **Compatibility**: Ensure that legacy users do not lose progress after an update.
- **Synchronization**: Verify parity between Supabase and local storage (WASM SQLite).
- **Atomicity**: Avoid partial or corrupt saves during massive operations.

For specific protocols on database migrations and schema parity, consult the standards manual.

## 🛠️ Session & Migration Lessons

- **Multi-tab Protection**: Use `BroadcastChannel` or Supabase Realtime to implement a "Last-Tab Wins" lock. If a secondary tab is opened, it MUST display a non-dismissible warning to prevent data corruption.
- **Safe Migration Protocol**: Before migrating to a new database schema or compression method (e.g., during Node.js/Vite upgrades), the system MUST perform an automated backup of the raw local data.
- **Version Check**: Always verify the `save_version` before attempting to load or migrate a user session.
- **Domain + Port Sandbox Isolation**: Browser databases (LocalStorage/IndexedDB) are strictly isolated by `Protocol + Domain + Port`. In local dev, if Vite fallbacks to a different port (e.g., `5174` because `5173` is occupied), a blank database state will load. Always check the active browser address before running DB restore operations.
- **Save Concurrency Redundancy**: Avoid invoking direct manual saves (`await game.save(false)`) inside UI/debug action loops or buttons if internal calls already trigger `scheduleSave()`. Concurrent duplicate saves inside the same millisecond trigger optimistic out-of-sync locks.
- **Safe Browser Storage Utility**: When persisting user preferences, flags, or settings in the browser (e.g., custom zoom levels), ALWAYS use the `@/logic/utils/storage` `safeStorage` wrapper. This avoids exceptions in strict server-side rendering (SSR), sandbox environments, or browsers with disabled storage.
- **Local Guest Isolation in Online Mode**: If `db.mode` is `'online'`, but the user ID is `'local_user'` (a guest account), you MUST skip all remote database calls (like cloud save updates/inserts, remote save fetches, or `profiles` table patches). All data and configurations for the guest account must remain 100% isolated to the client browser (LocalStorage and OPFS) to avoid invalid session or `400 Bad Request` errors.
