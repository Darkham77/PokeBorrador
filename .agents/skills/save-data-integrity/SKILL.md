---
name: save-data-integrity
description: Always ensure new changes to game state, saving, or Supabase logic do not break backward compatibility with old saves.
---

# Save Data Integrity Guidelines

As an AI agent working on this project, ALWAYS follow these rules whenever making modifications to:

- `src/stores/auth.js` (saving/loading logic)
- `src/stores/game.js` (initial state and data structure)
- Any Supabase database schema updates
- Features that add new properties to `state`

## 1. Backward Compatibility is Mandatory

When introducing new properties to the `INITIAL_STATE` in `src/stores/game.js`, **old user saves will not have these properties**.

- Always verify that the game can gracefully handle `undefined` or `null` for the new properties.
- Example: `state.newFeature = state.newFeature || defaultValue;`

## 2. Supabase Upsert Rule

The `game_saves` table uses an `upsert` mechanism that **overwrites** the existing `save_data` JSON for a player based on their `user_id`.

- **NEVER** overwrite the remote data with an empty state or `INITIAL_STATE` (like `starterChosen === false`).
- **ALWAYS** check that the local state has actually been populated from the database before allowing `saveGame()` to run. (E.g. respecting the `_saveLoaded` flag).

We keep a local fallback via `DBRouter` (SQLite/IndexedDB) that races against Supabase cloud saves.

- The client prefers the local state if its version or timestamp is newer.
- If you accidentally trigger an early `saveGame()`, it will pollute the local database with a new timestamp and empty data, causing users to lose progress on the next load. Always defend the save logic against premature execution.

## 3. SQLite System Config Parsing

When reading values from the `system_config` table in SQLite (e.g., `db_version`), be aware that values might be stored as JSON strings due to Postgres translation.

- **REQUIRED**: Always use a robust parser that handles both raw strings and JSON objects.
- **PATTERN**: Check if the string starts with `{` or `[` and attempt `JSON.parse()` before using the value. (Ref: `src/logic/db/dbRouter.js`).

## 4. Required Migration Step

If you change how a key piece of data is formatted (e.g. converting `badges` from an integer to an array), you MUST write a runtime migration block in the corresponding store initialization to convert the old data structure to the new one for existing players.

## 5. Centralized Registry & ID Mapping

 When adding new classifications (like Pokémon Tags), ALWAYS use a centralized registry (e.g. `src/logic/constants/tags.js`) as the Single Source of Truth.

- **ID Normalization**: Maintain a clear mapping between UI identifiers (short, for buttons) and Database IDs (long, for persistence).
- **Helper Usage**: ALWAYS use standardized helpers (e.g. `hasPokemonTag`) instead of manual array checks to ensure consistent logic across all entry points.

## 6. Bridge Safety: Search-Based Indexing

 When executing commands that modify a specific item in a list (e.g., tagging a Pokemon in the Box), DO NOT trust index properties passed from filtered or sorted UI views.

- **PATTERN**: Inside the action handler, calculate the "Real Index" by searching the original store array using a unique identifier (`UID`).
- **WHY**: This prevents "Off-by-One" errors or data corruption when the UI list is out of sync with the underlying database array.

- **Protocols for Storage Operations (Swap vs Move)**: When modifying the player's team via the storage system (Box), always distinguish between an addition (push) and an exchange (swap).
  - **PATTERN**: If the target team slot is empty, use `moveBoxToTeam(boxIndex)`. If the slot is occupied, use `swapBoxWithTeam(boxIndex, teamIndex)`.
  - **WHY**: Simple addition (push) will fail if the team is already at its maximum capacity (6 members). Implementing a dedicated swap mechanism ensures that team rotations are always possible regardless of current occupancy.

## 7. Self-Healing and Data Sanitization

 Pokémon created via legacy systems or debug tools may lack critical combat data (`power`, `type`, `cat`, `pp`).

- **MANDATORY**: Implement "Self-Healing" logic in all centralization points (e.g., `recalcPokemonStats` in `pokemonFactory.js`).
- **PATTERN**: If an object exists but its properties are `undefined`, use a data provider to fetch and merge missing properties from the Source of Truth (`MOVE_DATA`).
- **WHY**: This prevents `NaN` or `0` damage bugs in combat and ensures a consistent experience without needing manual data migrations for every debug/legacy unit.

## 8. Batch Processing & Atomic Saves

When performing multiple mutations that trigger persistent saves (e.g., selling multiple item stacks, releasing several Pokémon), avoid calling `save()` or the database router inside loops.

- **PATTERN**: Implement a `processBatchAction` that performs all necessary state modifications locally first (using atomic updates) and calls the save operation exactly once at the end.
- **WHY**: This minimizes database overhead, reduces the risk of partial state corruption if a connection fails mid-loop, and ensures that UI reactivity is synchronized with the final saved state.

## 8. Pre-Flight Checklist

Before applying any change relating to data persistence:

1. [ ] Did I add a fallback for old users missing the new variables?
2. [ ] Is there any risk that this change could trigger `saveGame()` during a loading or disconnected state?
3. [ ] If changing a database table structure, did I account for the fact that previous rows only have the old columns/JSON keys?
