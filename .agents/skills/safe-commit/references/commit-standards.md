# Commit Message Standards (The Elegant Protocol)

Commit messages MUST NOT be terse. They MUST provide a clear, technical chronicle of the "what", "why", and "how" to maintain the project's high-rigor history.

## Source of Truth per Phase

- **Phase 1 (The Snapshot)**: The source of truth is a synthesis of:
  1. The actual **`git diff` of all modified files** (staged and unstaged workspace changes).
  2. All **session artifacts** stored in `<appDataDir>/brain/<conversation-id>/` (`implementation_plan.md`, `task.md`, `walkthrough.md`, custom skill artifacts, scratch notes, and plan logs).
  You MUST cross-reference the code diff with the functional intent and feature/fix context from these artifacts to produce a precise, high-rigor technical chronicle. Do not rely on unverified memory alone.
- **Phase 4 (The Optimization / Docs Log)**: Use the current `task.md` and `walkthrough.md` as the primary sources. A commit message that ignores the granular steps recorded in these artifacts is considered a failure.

## Dual-Commit Strategy

| Commit | Phase | Purpose | Tone |
|:---|:---|:---|:---|
| **The Snapshot** | Phase 1 | Capture creative/logical work & unit tests | Elegant Protocol (Header + Body with bullets) |
| **The Optimization Log** | Phase 4 | Document technical cleanup & approved docs | Concise — only audit repairs, linting fixes, DOX updates |

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
- Aggregated ranges of IDs (e.g., "FIX-01 to FIX-121", "fixes 1 to 80") without explicit technical bullets detailing the actual changes made.
- Vague descriptions like "minor changes" or "various fixes" without specifying the technical "what".
- Commit messages written from memory instead of reviewing the actual `git diff`.

## Environment Notes

- **PowerShell command chaining**: PowerShell does NOT support && as a command separator (it is a ParserError). Always use ; to chain sequential commands (e.g., git add -A; git status). Note that ; runs the second command unconditionally — if conditional execution is needed, use if ( -eq 0) { ... }.
