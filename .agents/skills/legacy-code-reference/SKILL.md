---
name: legacy-code-reference
description: Access, search, and compare pre-Vue legacy code from the backup directory. Use this skill whenever the user asks to "remember", "compare", or "check" how things worked before the Vue migration, or when investigating regressions that might be linked to the migration.
---

# Legacy Code Reference

This skill provides a secure, read-only interface to the legacy codebase stored in the `backup_legacy_code` directory. It is essential for maintaining consistency and fixing regressions caused by the transition to Vue 3.

## Trigger Conditions

Use this skill when:

- The user mentions "código viejo", "backup", "antes de Vue", "versión legacy", or "legacy code".
- You encounter a bug that seems to be a regression from the old system.
- You need to understand the original JavaScript logic that preceded a current Vue component.

## Core Rules
>
> [!CAUTION]
> **STRICT READ-ONLY ACCESS**: You MUST NEVER modify, delete, or create any file within the `backup_legacy_code` directory. Treat it as an immutable archive.

## How to use

1. **Locate the Backup**: The legacy code is located at `backup_legacy_code` in the project root.
2. **Search and Compare**:
   - Use `grep_search` or `list_dir` to find relevant legacy files.
   - Use `view_file` to read the legacy implementation.
   - Compare the legacy logic with the current implementation in `src/`.
3. **Presenting Findings**:
   - When explaining differences, clearly label snippets as `[LEGACY]` and `[CURRENT]`.
   - Focus on logic changes, state management shifts, or CSS regressions.

## Directory Structure (Legacy)

- `/js`: Original JavaScript game engine and logic.
- `/assets`: Old images, sounds, and global assets.
- `index.html`: The monolithic entry point of the old system.
- `style_v5.css`: The primary legacy stylesheet.
- `server.js`: The original backend logic.

## Comparison Example

**User**: "The battle text used to be slower, how was it before?"
**Action**: Search `backup_legacy_code/js/battle.js` for speed variables, compare with current `src/logic/battle/`.
