# Purpose

Manage the logic and assets of auth.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dead State Chain Rule**: When removing a write-only state variable or its setter (e.g., `setLastLoadedSaveTime`), you MUST trace and remove ALL upstream sites that compute the value passed to that setter. Leaving orphaned assignment-only code behind produces TS6133 errors. Checklist: (1) grep all call sites of the setter, (2) check if the computed value serves any other purpose, (3) if not, delete the entire computation block together with the call site.
- **Database Column Naming & Zero-Fallback Persistence**: When synchronizing profile or save state data to the database (`db.from('profiles').update(...)` / `.insert(...)`), all payload keys MUST strictly match the exact static database schema column names in `snake_case` (e.g., `capture_successes`, `capture_attempts`). Adding runtime fallback expressions (e.g. `|| 0`, `|| 'h'`, `|| 1`) in persistence payloads is strictly prohibited; values must flow directly from canonical, validated DTOs.
- **Database Single Source of Truth & Zero Cache Override**: When loading game state in `loadBestSave`, any existing database record in `game_saves` (whether online Supabase or offline SQLite) MUST ALWAYS take absolute precedence over local client caches (OPFS / LocalStorage). Allowing local timestamps (`_last_updated`) to override database rows is strictly prohibited, as it breaks server rollbacks, backup restorations, and static database migrations. When a database row is loaded, local OPFS and storage caches MUST be synchronized immediately with the database state.
- **Debug Mode Unreleased Species Save Permissiveness**: When debug mode is active (`window.__VITE_DEBUG__` or URL parameter `debug`), `validateAndSanitize` in `saveSanitizer.ts` MUST evaluate `checkPokemonLegality` with `{ allowUnreleased: true }` and `validatePokemon(p, true)`. Unreleased species in debug sessions must persist cleanly to local SQLite saves without being marked as illegal.
- **Mandatory Single-Save per Complex Flow (No Saves Inside Loops) & Hybrid Save Architecture**: Complex operations, batch routines, or multi-item claim flows (e.g. bulk reward claiming, tournament resolution, mass market operations) MUST NEVER invoke database/OPFS saves inside loops or per-item iterations. They MUST run within a batch context (`withBatchSave`) or with intermediate saves silenced, executing exactly ONE single atomic save at the end of the entire routine. Furthermore, the save subsystem operates under a hybrid architecture: spontaneous background updates (`scheduleSave()`) use a coalescing debounce coordinator (1.5s delay) to combine high-frequency state changes into a single physical write, while critical actions (log out, combat conclusion, manual save) bypass the coordinator with immediate execution (`immediate: true`).
- **SaveCoordinator Architecture (`src/logic/auth/saveCoordinator.ts`)**: All save orchestration, coalescing debounce (1.5s window), batch context suppression (`withBatchSave<T>(action: () => Promise<T>): Promise<T>`), and emergency flushes (`flushPendingSave()`) MUST be encapsulated cleanly in `saveCoordinator.ts`. `gameStore.save()`, `scheduleSave()`, and domain stores delegate save dispatching to this coordinator, ensuring physical I/O writes (SQLite OPFS export and remote RPCs) are strictly bounded. A global `beforeunload` listener in the coordinator must automatically trigger `flushPendingSave()` and sync a synchronous emergency snapshot to local storage if deferred writes are pending when the browser closes.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
