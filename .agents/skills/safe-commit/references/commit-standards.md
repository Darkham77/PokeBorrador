# Commit Message Standards (The Elegant Protocol)

Commit messages MUST NOT be terse. They MUST provide a clear, technical chronicle of the "what", "why", and "how" to maintain the project's high-rigor history.

## Source of Truth for Commit Synthesis

The final commit message is synthesized exclusively in **Phase 4 (Step 4.2)** from:
1. The actual **`git diff` of all modified files** across the session.
2. All **session artifacts** stored in `<appDataDir>/brain/<conversation-id>/` (`implementation_plan.md`, `task.md`, `walkthrough.md`, custom skill artifacts, scratch notes, and plan logs).
3. The **unit tests added in Phase 1**, **audit repairs / optimizations in Phase 2**, and **lessons / DOX updated in Phase 3**.

You MUST cross-reference the code diff with the functional intent and feature/fix context from these artifacts to produce a precise, high-rigor technical chronicle. Do not rely on unverified memory alone.

## Single Atomic Certified Commit Strategy

The project mandates **Atomic Commits**. A commit is never created until all tests, audits, typechecks, builds, and documentation approvals are complete.

| Phase | Action | Purpose | Output |
|:---|:---|:---|:---|
| **Phase 1** | Safety Backup & Pre-Draft | Safe local recovery & early message drafting | Patch file in `scratch/backups/` (Zero git commits) |
| **Phase 2** | Active Verification | Verify and repair code in workspace | Clean code, 0 errors, 0 new warnings, build exit 0 |
| **Phase 3** | Documentation & Approval | Document lessons & get user review | `AGENTS.md` and walkthrough updated |
| **Phase 4** | Single Atomic Commit | Consolidate entire verified unit of work | Exactly ONE elegant commit in Git history |

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
- Added comprehensive unit tests in tests/unit/battle/ verifying all silhouette states.
- Updated AGENTS.md in src/components/battle/ with the GPU matrix filter pattern.
```

## Forbidden Patterns

- Single-word messages (`commit`, `update`, `fix`).
- Messages without a bulleted list for changes involving 2+ files.
- Aggregated ranges of IDs (e.g., "FIX-01 to FIX-121", "fixes 1 to 80") without explicit technical bullets detailing the actual changes made.
- Vague descriptions like "minor changes" or "various fixes" without specifying the technical "what".
- Commit messages written from memory instead of reviewing the actual `git diff`.

## Environment Notes

- **PowerShell command chaining**: PowerShell does NOT support && as a command separator (it is a ParserError). Always use ; to chain sequential commands (e.g., git add -A; git status). Note that ; runs the second command unconditionally — if conditional execution is needed, use if ( -eq 0) { ... }.
