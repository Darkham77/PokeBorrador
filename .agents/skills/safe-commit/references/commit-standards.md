# Commit Message Standards (The Elegant Protocol)

Commit messages MUST NOT be terse. They MUST provide a clear, technical chronicle of the "what", "why", and "how" to maintain the project's high-rigor history.

## Source of Truth per Phase

- **Phase 0 (The Snapshot)**: The absolute source of truth is the actual **`git diff` of all modified files**. You MUST inspect all unstaged and staged changes in the workspace since the last commit and document all of them. Do not rely on memory or conversation context alone.
- **Phase 9 (The Optimization Log)**: Use the current **task** and `walkthrough.md` as the primary sources. A commit message that ignores the granular steps recorded in these artifacts is considered a failure.

## Dual-Commit Strategy

| Commit | Phase | Purpose | Tone |
|:---|:---|:---|:---|
| **The Snapshot** | Phase 0 | Capture creative/logical work | Elegant Protocol (Header + Body with bullets) |
| **The Optimization Log** | Phase 9 | Document technical cleanup | Concise — only audit repairs, linting fixes, SASS repairs |

## Structure (The Elegant Protocol)

```text
<type>(<scope>): <short imperative description>

- <what changed and why — bullet 1>
- <what changed and why — bullet 2>
- <what changed and why — bullet 3>
```

**Types**: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`

**Rules**:

- The header line is the commit summary — keep it under 72 characters.
- Every bullet must specify *what* changed and *why* it matters technically.
- For changes across 2+ files, a bulleted list is MANDATORY.

## Gold Standard Example

```text
feat(battle): optimize silhouette rendering and sync wild encounter timing

- Migrated silhouette filter from feFlood to feColorMatrix for improved GPU performance.
- Reduced wild Pokémon emergence Phase 1 duration from 2.2s to 1.1s for faster gameplay.
- Synchronized isWildSilhouetteHalfway trigger at 550ms with the sprite jump animation.
- Implemented isFloating metadata check to automatically hide ground grass bushes for flying species.
- Refactored useBattleAnimations.ts to centralize encounter phase constants.
```

## Optimization Log Example

```text
refactor(audit): resolve SASS traps and 12 linting warnings in BattleHUD

- Replaced hardcoded z-index 99 with $z-battle-hud variable from visuals.ts.
- Added will-change: transform to 3 filter chains missing GPU promotion.
- Fixed 4 unused import warnings introduced during composable extraction.
```

## Forbidden Patterns

- Single-word messages (`commit`, `update`, `fix`).
- Messages without a bulleted list for changes involving 2+ files.
- Vague descriptions like "minor changes" or "various fixes" without specifying the technical "what".
- Commit messages written from memory instead of reviewing the actual `git diff`.

## Environment Notes

- **PowerShell command chaining**: PowerShell does NOT support && as a command separator (it is a ParserError). Always use ; to chain sequential commands (e.g., git add -A; git status). Note that ; runs the second command unconditionally — if conditional execution is needed, use if ( -eq 0) { ... }.
