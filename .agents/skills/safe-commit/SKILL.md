---
name: safe-commit
description: High-rigor safeguard for repository operations. Trigger this skill whenever the user explicitly requests a "commit", "push", "git commit", or "safe-commit" in their prompt. It enforces a strict Zero-Warning policy (0 errors, 0 warnings) and absolute compliance with @/project-standards. Do NOT trigger for automatic background operations or unless a commit is explicitly requested by the user.
---

# Safe Commit Workflow: Poké Vicio Edition

## Triggering

> [!IMPORTANT]
> **PROMPT-DRIVEN TRIGGER**: This skill MUST be used whenever the user explicitly asks to commit or push changes (e.g., "commit", "push", "git commit", "upload changes"). It MUST NOT be used for automatic agent internal saves or background operations unless the user initiates the command.

This skill ensures that NO BROKEN OR MESSY CODE is ever committed. It leverages the project's internal validation scripts (SASS Traps, Hybrid Detection) and standard linting/testing to guarantee a production-ready state.

## Execution Steps

### Workflow Overview

```mermaid
graph TD
    Start((START)) --> Snapshot[0. Initial Snapshot Commit]
    Snapshot --> Tracking[1. Task & Scratchpad Tracking]
    Tracking --> |"Dynamic task update"| Tracking
    Tracking --> GapAnalysis[2. Test Gap Analysis]
    GapAnalysis --> |"Missing Tests Detected?"| CreateTests[2.1 Create Unit Tests SUB-TASK]
    CreateTests --> Verification[3. Active Verification Cycle]
    GapAnalysis --> Verification
    
    subgraph "The Zero-Warning Audit"
        Verification --> FullAudit[3.1 Full Project Audit]
        FullAudit --> AutoFix[3.2 Automatic Repair Pass]
        AutoFix --> ManualDiscovery[3.3 Manual Repair Discovery]
        ManualDiscovery --> ManualFix[3.4 Manual Repair Phase]
        ManualFix --> FinalAudit[3.5 Final Validation Pass]
        
        FinalAudit --> Lint[Linting]
        Lint --> Types[Type-Safety]
        Types --> Build[Production Build]
        Build --> UnitTests[Unit Tests]
        UnitTests --> Global[Global Compliance]
    end
    
    Global --> DBCheck{DB Changes?}
    DBCheck -->|Yes| DBSync[4. Database Parity Sync]
    DBCheck -->|No| Recovery[5. Failure Recovery]
    DBSync --> Recovery
    
    Recovery -->|FAIL| Verification
    Recovery -->|PASS| Cleanup[6. Workspace Cleanup]
    Cleanup --> Walkthrough[7. Walkthrough Update]
    Walkthrough --> Lessons[8. Lessons Extraction]
    Lessons --> LessonApproval[8.1 Lesson Approval]
    LessonApproval --> SkillVerification[8.2 Skill Implementation Verification]
    
    SkillVerification --> Commit[9. Final Optimization Commit]
    Commit --> Notify[10. Final Status & Instructions]
    Notify --> End((END))
    
    style Start fill:#f9f,stroke:#333,stroke-width:4px
    style End fill:#f9f,stroke:#333,stroke-width:4px
    style Recovery fill:#ff9,stroke:#333,stroke-width:2px
    style Verification fill:#dfd,stroke:#333,stroke-width:2px
```

> [!IMPORTANT]
>
> - **IMMUTABLE STEPS**: You MUST follow every step in this diagram. You are allowed to add intermediate sub-tasks for complex features, but you are FORBIDDEN from deleting or skipping any original design steps.
> - **Incremental Update & Visual Proof**: Keep the **task** and **scratchpad** updated **phase by phase**. After updating the **task**, you MUST include a small snippet of the updated checklist in your response to the USER as visual proof of progress. **Advancing without updating the source of truth is a violation of project standards.**

### 0. Initial Snapshot Commit (CRITICAL)

BEFORE touching any files or starting the verification cycle, you MUST perform an initial commit to safeguard the current state.

1. **Analyze Diff and Status**: Run `git status` and `git diff` to analyze ALL modified and untracked files in the workspace since the last commit. You MUST NOT rely solely on the current conversation context.
2. **Comprehensive Message**: You MUST review every single modified file's diff to understand the changes made (even those from previous sessions or manual edits).
3. `git add .`
4. **Commit Message**: Use the "Elegant Protocol" (Step 189) to describe the work performed. The message MUST capture all changes across all modified files in the workspace since the last commit, not just those related to the current conversation.
5. **Why**: This ensures that even if an automated repair tool or linter modifies files, your original logic is preserved in the history and can be easily diffed.

### 1. Task & Scratchpad Tracking (MANDATORY)

Before making any significant changes or finalizing tasks, maximum traceability of the process MUST be guaranteed using only the **task** and **scratchpad** artifacts.

- **Rigor in Tracking**: Create a **NEW task** artifact. This is the **absolute source of truth**; it must record every granular step from scratch, avoiding inheriting tasks from previous sessions.
- **Scratchpad Usage**: Use the **scratchpad** artifact for temporary notes, log captures, and intermediate data processing.
- **Documented Closure**: Always update `walkthrough.md` with evidence (screenshots, test logs) to close the technical rigor cycle.
- Verify that every change aligns with the **Hybrid Retro-Modern** identity.

### 2. Test Gap Analysis

Review all modified files in `src/logic/`.

- Identify any new logic (battle calculations, move effects, evolution logic) that lacks corresponding tests in `tests/unit/`.
- **ABSOLUTE MANDATORY SUB-TASK**: If any modified file in `src/logic/` lacks unit tests, you **MUST** implement them immediately. There is no "worthy" exception; any logic change requires a corresponding test to ensure zero regressions. Add this as a high-priority **SUB-TASK** in the **task**.
- **NEVER FORGET**: While adding tests, the general objective of committing clean, verified code must remain the priority.

### 3. Active Verification Cycle (The "Zero-Warning" Audit)

You MUST run these commands and fix EVERY issue until a clean pass is achieved. 

> [!IMPORTANT]
> **Pre-existing Warnings**: If the audit (Lint, Types, SASS) reveals warnings or errors in files you did not modify, you ARE RESPONSIBLE for fixing them before committing. A "Safe Commit" means a 100% clean repository state, not just for your changes.

**THE MANDATORY AUDIT PIPELINE:**

1.  **Full Audit Pass**: `npm run audit:full`
    - This command captures EVERYTHING (SASS, GPU, FSM, SQL, Items, Moves, Abilities).
    - **CRITICAL**: You MUST NOT skip this. It is the only way to ensure total system integrity.
    - **Context Protection**: If the audit outputs a massive log that threatens to saturate the context window, run the validation scripts using their summary or report variants to keep console logs clean:
      - For high-level summaries: `npm run audit:summary`, `npm run validate:items:summary`, `npm run validate:abilities:summary`, `npm run validate:moves:summary`, `npm run validate:sandbox:summary`, or `npm run validate:fsm:summary`.
      - For redirecting full outputs to files: `npm run audit:report` (writes to `scratch/audit_report.txt`), `npm run validate:items:report` (writes to `scratch/items_report.txt`), `npm run validate:abilities:report` (writes to `scratch/abilities_report.txt`), `npm run validate:moves:report` (writes to `scratch/moves_report.txt`), `npm run validate:sandbox:report` (writes to `scratch/sandbox_report.txt`), or `npm run validate:fsm:report` (writes to `scratch/fsm_report.txt`). All validation/audit reports MUST be generated under the `scratch/` folder. Read these output files using `view_file` to review issues.
2.  **Automatic Repair**: `npm run audit:fix`
    - Run this to handle easy fixes (Viewports, Node prefixes, ESM extensions).
3.  **Manual Repair Discovery (THE REPORT)**:
    - Review the output of `audit:full` (or the generated report files) again.
    - Identify all warnings/errors that `:fix` DID NOT resolve (e.g., `gpuGaps`, `legacyDates`, `zIndexAudit`).
    - **Targeted Fallow Audit**: Run `npx fallow` on the specific files modified or added in this commit attempt (you can list these files using `git status` or `git diff --name-only HEAD`). To prevent context saturation, direct the output of fallow commands to files inside the `scratch/` directory (e.g., `npx fallow > scratch/fallow_report.txt` or filtering specific files) and analyze the reports using `view_file`. Check if these modified files introduce any new unused exports, dead code, or exceed complexity thresholds.
    - **MANDATORY**: List all these issues, audit warnings, lint errors, AND Fallow recommendations for the modified files in your response to the user as a "Technical Debt Report" before proceeding to fix them manually.
4.  **Manual Repair Phase**:
    - Fix each identified issue manually in the code.
    - If a `z-index` is hardcoded, find the correct variable in `visuals.ts`.
    - If a `filter` is missing `will-change`, add it.
5.  **Final Validation Pass**:
    - `npm run validate:types`
    - `npm run lint`
    - `npx fallow health --score` (Verify overall project health score has not regressed)
    - `npx fallow dupes --fail-on-issues` (Ensure zero duplicate/clone issues)
    - `npx fallow security --fail-on-issues` (Ensure zero security candidate issues)
    - `npm run test`
    - `npm run build`

### 4. Database Triple Parity Sync

If the database schema has changed:

1. Verify the SQL migration exists in `database/migrations/`.
2. Verify the Vite plugin has regenerated `src/logic/db/migrations_data.ts`.
3. Verify the absolute schema in `database/schemas/` is updated.
4. **Local Sync**: If testing locally, ensure the WASM SQLite engine is initialized correctly with the new delta.

### 5. Failure Recovery & Workflow Projection

- If any check fails, fix the issue and **RE-START Step 3**. A fix for a lint error might break a build or introduce a SASS trap.

> [!CAUTION]
> **STOP ON FAILURE**: If something does not work or a test fails, you MUST fix it immediately. It is forbidden to proceed to the next step or attempt the commit if the verification cycle is not perfect.

> [!IMPORTANT]
> **WORKFLOW PROJECTION & PROGRESS UPDATE**: After any correction, test creation, or **upon finalizing a logical phase**, you MUST explicitly update the **task** and list the REMAINING steps. Do not stop until the verification cycle returns 100% success and all tasks (including newly discovered sub-tasks) are completed.

### 6. Workspace Cleanup (MANDATORY)

Before extracting lessons or committing, you MUST clean up all temporary artifacts created during the development or verification process.

- **Scratch Mandate Adherence**: Verify that any temporary files, debug outputs, text reports, or summaries created for review or study were written exclusively to the `scratch/` directory.
- Delete all files and content in the **scratchpad** that are no longer needed.
- Delete any ad-hoc test files, logs, or reports created. All files generated for inspection, review, or later study MUST be deleted from the `scratch/` directory (e.g., `scratch/audit_report.txt`, `scratch/items_report.txt`, etc.). **CRITICAL: NEVER delete `requirements.txt` in the root.**
- Ensure `git status` does not show untracked temporary files, logs, or report files in the project root or source directories.

### 7. Walkthrough Generation (MANDATORY)

Before extracting lessons, you MUST create or update the `walkthrough.md` artifact.

- **Content**: Summarize the changes made, the files affected, and the verification results.
- **Evidence**: Embed any relevant screenshots or recordings produced during the task.

### 8. Lessons Extraction (LOCAL)

Run **@/extract-lessons** to capture patterns (e.g., a new SASS trick or a CSS/GSAP optimization). This is a **local documentation task** and MUST NOT involve a browser subagent.

- **Lesson Approval Mandatory & Hard Stop**: After **@/extract-lessons** presents the lesson mapping table, you MUST **STOP** immediately. This approval step is exclusively for validating the new knowledge/lessons to be persisted. You are FORBIDDEN from calling any other tool (especially `git` or `write_to_file`) until the user provides explicit approval of these lessons.
- **NEVER COMMIT BLINDLY**: It is strictly forbidden to proceed to Step 8.2 without explicit user confirmation of the extracted lessons plan.
- **Mental State Check**: Before requesting approval, read the **task** one last time to ensure every single sub-item is marked as `[x]`.

### 8.2. Skill Implementation Verification (HARD STOP)

After the lessons are distributed and the skill files are updated by `@/extract-lessons` (via Phase 3), you MUST perform a second verification.

1. **Self-Review**: Read the modified `SKILL.md` files to ensure the content matches the approved plan.
2. **User Approval Mandatory**: You MUST explicitly ask the user: "Are the changes applied to the skills correct?".
3. **Hard Stop**: You are FORBIDDEN from proceeding to Step 9 until the user provides an explicit "Yes" or approval of the final file content.

### 9. Final Optimization Commit

After the user approves the final skill implementation in Step 8.2, you MUST perform a second and final commit capturing the optimizations and fixes from the audit cycle.

1. `git status` to verify staged changes (only audit-related diffs should remain).
2. `git add .`
3. **Commit Message (The Optimization Log)**: The header should use `refactor(audit):` or `fix(lint):`. The body MUST focus **ONLY** on the technical optimizations, linting fixes, and SASS repairs performed during Step 3.
4. **Example**: `refactor(audit): resolve SASS traps and 12 linting warnings in BattleHUD`.

### 10. Final Status & Instructions

Notify the user that the commits (Snapshot and Optimization) have been successfully created.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the `push` manually when ready.
- **Zero Audit Failures**: The project is now fully migrated. Under NO circumstances are audit failures (SASS, Aesthetics, Length, FSM, Types, Lint) allowed in any commit. Every single commit must be 100% clean and compliant with the validation pipeline.

## Commit Message Standards (The Elegant Protocol)

Commit messages MUST NOT be terse. They MUST provide a clear, technical chronicle of the "what", "why", and "how" to maintain the project's high-rigor history.

### 0. Source of Truth

- **MANDATORY for Phase 0 (The Snapshot)**: Since this runs before the task/walkthrough are finalized for the current session, the absolute source of truth is the actual **`git diff` of all modified files**. You MUST inspect all unstaged and staged changes in the workspace since the last commit and list/comment on all of them.
- **MANDATORY for Phase 9 (The Optimization Log)**: Use the current **task** and `walkthrough.md` as the primary sources for the commit message. A commit message that ignores the granular steps recorded in these artifacts is considered a failure.

### 1. Dual-Commit Strategy

- **The Snapshot (Phase 0)**: Its purpose is to capture creative/logical work. It MUST use the "Elegant Protocol" (Header + Body with bullets) to explain the "what" and "why" of all modified files in the workspace (analyzing `git diff`), ensuring that no changes since the last commit are left undocumented.
- **The Optimization Log (Phase 9)**: Its purpose is to document technical cleanup. It must be concise and list only audit repairs (linting, build fixes, SASS repairs).

### 2. Structure Requirement (The Elegant Protocol)

### 2. Master Example (The Gold Standard)

```text
feat(battle): optimize silhouette rendering and sync wild encounter timing

- Migrated silhouette filter from feFlood to feColorMatrix for improved GPU performance.
- Reduced wild Pokémon emergence Phase 1 duration from 2.2s to 1.1s for faster gameplay.
- Synchronized isWildSilhouetteHalfway trigger at 550ms with the sprite jump animation.
- Implemented isFloating metadata check to automatically hide ground grass bushes for flying species.
- Refactored useBattleAnimations.ts to centralize encounter phase constants.
```

### 3. Forbidden Patterns

- Single-word messages (e.g., `commit`, `update`, `fix`).
- Messages without a bulleted list for changes involving 2+ files.
- Vague descriptions like "minor changes" without specifying the technical "what".

## Example Recovery Strategy

**Correct Behavior after a fix:**
"Fixed lowercase filter collision in `MapCard.vue`.
**Workflow Projection**:

1. [ ] Re-run `audit_project.py` (Step 3).
2. [ ] Run `npm run build` to verify compilation.
3. [ ] Workspace Cleanup (Step 6).
4. [ ] Extract lessons (Step 7).
5. [ ] **Wait for Lesson Approval** (Step 8.1).
6. [ ] **Wait for Skill Implementation Verification** (Step 8.2).
7. [ ] Final Optimization Commit (Step 9).
"

### 11. Rigor Enforcement (Anti-Shortcut Rule)

- **No Phase-Jumping**: It is strictly forbidden to execute steps 9 or 10 if steps 1-8 are not fully documented and checked in the **task**.
- **Test Implementation Check**: You are FORBIDDEN from committing if there are identified "Missing Tests" in Step 2 that haven't been implemented and marked as `[x]`.
- **Contextual Review**: Before each tool call in the verification cycle, ask yourself: "Is my task updated with the result of the *previous* tool call?". If not, update it first.
