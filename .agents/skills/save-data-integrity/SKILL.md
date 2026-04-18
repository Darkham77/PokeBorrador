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

## 4. Required Migration Step

If you change how a key piece of data is formatted (e.g. converting `badges` from an integer to an array), you MUST write a runtime migration block in the corresponding store initialization to convert the old data structure to the new one for existing players.

## 5. Pre-Flight Checklist

Before applying any change relating to data persistence:

1. [ ] Did I add a fallback for old users missing the new variables?
2. [ ] Is there any risk that this change could trigger `saveGame()` during a loading or disconnected state?
3. [ ] If changing a database table structure, did I account for the fact that previous rows only have the old columns/JSON keys?
