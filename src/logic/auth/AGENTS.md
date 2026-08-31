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

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
