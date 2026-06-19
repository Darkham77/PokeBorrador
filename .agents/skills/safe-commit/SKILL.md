---
name: safe-commit
description: MANDATORY safeguard for repository operations. You MUST trigger and follow this skill whenever the user asks to commit, push, git commit, push changes, save changes, or safe-commit (including variations like "commit seguro", "safe commit", "subir cambios", "guardar cambios", "guardar seguro"). Standard commits or pushes are strictly forbidden without running this validation pipeline first. Do NOT trigger for automatic agent-internal saves.
---

# Safe Commit Workflow: Poké Vicio Edition

> [!IMPORTANT] **PROMPT-DRIVEN TRIGGER ONLY**: Activate when the user explicitly requests a commit or push. Do NOT activate for automatic agent-internal saves or background operations.

This skill ensures that NO BROKEN OR MESSY CODE is ever committed. It leverages the project's internal validation scripts (SASS Traps, Hybrid Detection) and standard linting/testing to guarantee a production-ready state.

## Execution Steps

### Workflow Overview

```mermaid
graph TD
    Start((START)) --> Snapshot[0. Initial Snapshot Commit]
    Snapshot --> Tracking[1. Task & Scratchpad Tracking]
    Tracking --> |"Dynamic task update"| Tracking
    Tracking --> GapAnalysis[2. Test Gap Analysis]
    GapAnalysis --> MissingTests{Missing Tests?}

    MissingTests -->|Yes| CreateTests[2.1 Create Unit Tests SUB-TASK]
    MissingTests -->|No| Verification

    CreateTests --> Verification

    subgraph "The Zero-Warning Audit"
        Verification[3. Active Verification Cycle] --> FullAudit[3.1 Full Project Audit]
        FullAudit --> AutoFix[3.2 Automatic Repair Pass]
        AutoFix --> ManualDiscovery[3.3 Autonomous Repair Discovery]
        ManualDiscovery --> ManualFix[3.4 Autonomous Repair Phase]
        ManualFix --> FinalAudit[3.5 Final Validation Pass]

        FinalAudit --> Lint[Linting]
        Lint --> Types[Type-Safety]
        Types --> Build[Production Build]
        Build --> UnitTests[Unit Tests]
        UnitTests --> HealthScore[Health Score Comparison]
        HealthScore --> Global[Global Compliance]
    end

    Global --> ValidationGate{Validation Successful?}

    ValidationGate -->|No| Verification

    ValidationGate -->|Yes| HealthCompare{Health Score Regressed?}

    HealthCompare -->|Yes| Verification

    HealthCompare -->|No| DBCheck{DB Changes?}

    DBCheck -->|Yes| DBSync[4. Database Parity Sync]
    DBCheck -->|No| Recovery[5. Failure Recovery]

    DBSync --> Recovery

    Recovery --> Cleanup[6. Workspace Cleanup]
    Cleanup --> Walkthrough[7. Walkthrough Generation]
    Walkthrough --> DoxPass[7.1 DOX Update & Pass]
    DoxPass --> Lessons[8. Lessons Extraction]
    Lessons --> LessonApproval[8.1 Lesson Approval]

    LessonApproval -->|Rejected| Lessons
    LessonApproval -->|Approved| SkillVerification[8.2 Skill Verification]

    SkillVerification -->|Rejected| Lessons
    SkillVerification -->|Approved| Commit[9. Final Optimization Commit]
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
2. **AGENTS.md Chain Review**: Identify every file you modified. For each one, walk the path from the repo root and read every `AGENTS.md` found along the route. Confirm that the changes do not contradict any local contract (the closest `AGENTS.md` controls). If a contradiction is found, resolve it before committing.
3. **Initial Project Health**: Run `npx fallow health --score` to capture and record the starting health score of the project before any modifications, to compare with the final score at Step 3.5.
4. **Comprehensive Message**: Review every modified file's diff to understand the changes made, including those from previous sessions or manual edits.
5. `git add .`
6. **Commit Message**: Use the "Elegant Protocol" (see [commit-standards.md](./references/commit-standards.md)) to describe the work performed. The message MUST capture all changes across all modified files since the last commit, not just those from the current conversation.
7. **Why**: This ensures that even if an automated repair tool modifies files, your original logic is preserved in history and can be easily diffed.

### 1. Task & Scratchpad Tracking (MANDATORY)

Before making any significant changes or finalizing tasks, maximum traceability of the process MUST be guaranteed using only the **task** and **scratchpad** artifacts.

- **Rigor in Tracking**: Create a **NEW task** artifact. This is the **absolute source of truth**; it must record every granular step from scratch, avoiding inheriting tasks from previous sessions.
- **Scratchpad Usage**: Use the **scratchpad** artifact for temporary notes, log captures, and intermediate data processing.
- **Documented Closure**: Create or update `walkthrough.md` at Step 7 with evidence to close the technical rigor cycle.
- Verify that every change aligns with the **Hybrid Retro-Modern** identity.

### 2. Test Gap Analysis

For each modified file, ask: **"Does this file contain non-trivial logic?"** — functions with conditionals, computations, or state mutations. If yes, it needs test coverage.

**In-scope** (almost always): `src/logic/`, `src/stores/`, `src/composables/` with embedded logic, `src/utils/` and `src/helpers/` with pure functions.

**Out-of-scope** (unit tests don't apply): `src/components/` declarative templates, `src/views/` (E2E territory), `src/data/` static databases, `src/types/` TypeScript-only files.

- **ABSOLUTE MANDATORY SUB-TASK**: If any in-scope modified file contains new non-trivial logic without a corresponding test in `tests/unit/` or `tests/node/`, you **MUST** implement those tests immediately. There are no exceptions. Add this as a high-priority **SUB-TASK** in the **task**.
- **NEVER FORGET**: While adding tests, the general objective of committing clean, verified code must remain the priority.

### 3. Active Verification Cycle (The "Zero-Warning" Audit)

You MUST run these commands and fix EVERY issue until a clean pass is achieved.

> [!IMPORTANT] **NO VALIDATION EXEMPTIONS**: Every single step of the validation pipeline is STRICTLY MANDATORY. Under no circumstances (including "trivial" or minor single-token changes) may the agent skip any step, especially the production build (`npm run build`), type check, linting, tests, or audit.
> [!IMPORTANT] **Zero-Error Mandate for Build & Audit**: The final repository state MUST have exactly ZERO errors for both `npm run build` and the entire audit pipeline (`npm run audit` / `npm run audit:full`). Zero warnings are required for any file or block modified during the current session, but pre-existing warnings in unmodified legacy files may be bypassed if they do not block a successful build.
> [!IMPORTANT] **Mandatory Legacy & Unmodified Code Error Repair**: If the audit, typescript compiler, linting, or build checks reveal **errors** in files or blocks you did NOT modify (pre-existing or legacy code), you are STRICTLY REQUIRED to autonomously diagnose, fix, and repair them before committing. You are forbidden from leaving legacy errors unaddressed. Pre-existing warnings in unmodified files do not require repair.




**THE MANDATORY AUDIT PIPELINE:**

1. **Full Audit Pass**: `npm run audit:full`
   - This command captures EVERYTHING (SASS, GPU, FSM, SQL, Items, Moves, Abilities).
   - **CRITICAL**: You MUST NOT skip this. It is the only way to ensure total system integrity.
   - For the complete command reference (summary/report variants), see [validation_manual.md](../project-standards/references/qa/validation_manual.md).
   - **Context Protection**: If the audit output threatens to saturate the context window, use report variants:
     - High-level summaries: `npm run audit:summary`, `npm run validate:items:summary`, `npm run validate:abilities:summary`, `npm run validate:moves:summary`, `npm run validate:sandbox:summary`, `npm run validate:fsm:summary`.
     - Redirect to files: `npm run audit:report` → `scratch/audit_report.txt`, `npm run validate:items:report` → `scratch/items_report.txt`, `npm run validate:abilities:report` → `scratch/abilities_report.txt`, `npm run validate:moves:report` → `scratch/moves_report.txt`, `npm run validate:sandbox:report` → `scratch/sandbox_report.txt`, `npm run validate:fsm:report` → `scratch/fsm_report.txt`. All report files MUST go under `scratch/`. Use `view_file` to review them.

2. **Automatic Repair**: `npm run audit:fix`
   - Run this to handle easy fixes (Viewports, Node prefixes, ESM extensions).

   > [!IMPORTANT]
   >
   > The terms "Discovery" and "Repair" refer to actions performed by the AI agent. User intervention is NOT expected for: lint fixes, type fixes, audit repairs, missing tests, build failures, security warnings, or Fallow recommendations.
   >
   > The user should only be consulted when business, gameplay, product, or architectural decisions require human judgment.

3. **Autonomous Repair Discovery (THE REPORT)**:
   - Review the output of `audit:full` (or the generated report files) again.
   - Identify all warnings/errors that `:fix` DID NOT resolve (e.g., `gpuGaps`, `legacyDates`, `zIndexAudit`).
   - **Targeted Fallow Audit**: Always compare against `origin/main` to capture all local unpushed changes:
     - `git fetch origin main`
     - `npx fallow audit --changed-since origin/main > scratch/fallow_report.txt`
     - Use `view_file` to analyze the report. Ensure no new dead code, unused exports, duplication, or excessive complexity is introduced.
   - **MANDATORY**: List all issues, audit warnings, lint errors, and Fallow recommendations in your response as a "Technical Debt Report" before proceeding to repair them.

4. **Manual Repair Phase**:
   - Fix each identified issue autonomously in the code.
   - If a `z-index` is hardcoded, find the correct variable in `visuals.ts`.
   - If a `filter` is missing `will-change`, add it.

### Escalation Policy

The AI MUST continue autonomously unless one of the following conditions occurs:

- Multiple valid architectural solutions exist.
- Business requirements are unclear.
- Gameplay behaviour is ambiguous.
- Product direction requires explicit approval.

Only under these conditions may the AI request user intervention.

5. **Final Validation Pass**:
   - `npm run validate:types`
   - `npm run lint`
   - `npx fallow dupes --fail-on-issues`
   - `npx fallow security --fail-on-issues`
   - `npm run test`
   - **Health Regression Check**: Run `npx fallow health --score` and compare with the starting score from Step 0.3. If regressed, identify the complexity hotspots introduced by your changes, refactor them, and re-run until the score is equal to or greater than the baseline.
   - `npm run build`

### 4. Database Triple Parity Sync

If the database schema has changed:

1. Verify the SQL migration exists in `database/migrations/`.
2. Verify the Vite plugin has regenerated `src/logic/db/migrations_data.ts`.
3. Verify the absolute schema in `database/schemas/` is updated.
4. **Local Sync**: Ensure the WASM SQLite engine is initialized correctly with the new delta.

### 5. Failure Recovery & Workflow Projection

- If any check fails, fix the issue and **RE-START Step 3**. A fix for a lint error might break a build or introduce a SASS trap.

> [!CAUTION] **STOP ON FAILURE**: If something does not work or a test fails, you MUST fix it immediately. It is forbidden to proceed to the next step or attempt the commit if the verification cycle is not perfect.
> [!IMPORTANT] **WORKFLOW PROJECTION & PROGRESS UPDATE**: After any correction, test creation, or upon finalizing a logical phase, you MUST explicitly update the **task** and list the REMAINING steps. Do not stop until the verification cycle returns 100% success and all tasks are completed.

### 6. Workspace Cleanup (MANDATORY)

Before extracting lessons or committing, clean up all temporary artifacts.

- **Scratch Mandate Adherence**: Verify that any temporary files, debug outputs, text reports, or summaries were written exclusively to the `scratch/` directory.
- Delete all files and content in the **scratchpad** that are no longer needed.
- Delete all generated report files from `scratch/` (e.g., `scratch/audit_report.txt`, `scratch/fallow_report.txt`, etc.). **CRITICAL: NEVER delete `requirements.txt` in the root.**
- Ensure `git status` does not show untracked temporary files, logs, or report files in the project root or source directories.

### 7. Walkthrough Generation (MANDATORY)

Create or update the `walkthrough.md` artifact.

- **Content**: Summarize the changes made, the files affected, and the verification results.
- **Evidence**: Embed any relevant screenshots or recordings produced during the task.

### 7.1 DOX Maintenance (The DOX Pass) (MANDATORY)

Before proceeding to lessons extraction, you MUST perform a complete DOX check:

1. **Verify Changed Paths**: Review all modified files against their corresponding `AGENTS.md` files in their folder tree.
2. **Update Contracts and Content**: If the changes modified any purpose, rules, contracts, parameters, or configurations, update the nearest owning `AGENTS.md` to reflect these updates.
3. **Index Refresh**: If any new directory with an `AGENTS.md` file was created, add it to its parent's `Child DOX Index`.
4. **Run DOX Audit**: Verify that `npm run audit` runs successfully and reports 0 errors in the `DOX (AGENTS.md) Integrity` category. Any DOX errors must be fixed before proceeding.

### 8. Lessons Extraction (LOCAL) 🛑

Run **@/extract-lessons** to capture patterns (e.g., a new SASS trick or a CSS/GSAP optimization). This is a **local documentation task** and MUST NOT involve a browser subagent.

> [!CAUTION] **🛑 LESSON APPROVAL — HARD STOP**: After **@/extract-lessons** presents the lesson mapping table, you MUST **STOP** immediately. You are FORBIDDEN from calling any other tool (especially `git` or `write_to_file`) until the user provides explicit approval of the proposed lessons. This stop is about validating *what knowledge to persist*, not about the code itself.

- **NEVER COMMIT BLINDLY**: It is strictly forbidden to proceed to Step 8.2 without explicit user confirmation of the extracted lessons plan.
- **Mental State Check**: Before requesting approval, read the **task** one last time to ensure every single sub-item is marked as `[x]`.

### 8.2. Skill Implementation Verification ✅

After the lessons are distributed and the skill files are updated by `@/extract-lessons`, you MUST perform a second verification.

1. **Self-Review**: Read the modified `SKILL.md` files to ensure the content matches the approved plan.
2. **User Approval Mandatory**: Ask the user explicitly: "Are the changes applied to the skills correct?".

> [!CAUTION] **✅ SKILL APPROVED — HARD STOP**: You are FORBIDDEN from proceeding to Step 9 until the user provides an explicit "Yes". This stop is about validating the *persisted skill content*, which is separate from the lesson plan approval above.

### 9. Final Optimization Commit

After the user approves the final skill implementation in Step 8.2, perform a second and final commit.

1. `git status` to verify staged changes (only audit-related diffs should remain).
2. `git add .`
3. **Commit Message (The Optimization Log)**: Use `refactor(audit):` or `fix(lint):` as header. The body MUST focus **ONLY** on the technical optimizations, linting fixes, and SASS repairs performed during Step 3.
4. **Example**: `refactor(audit): resolve SASS traps and 12 linting warnings in BattleHUD`.

### 10. Final Status & Instructions

Notify the user that both commits (Snapshot and Optimization) have been successfully created.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. Inform the user that the local repository is clean and they should push manually when ready.
- **Zero Audit Failures**: Under NO circumstances are audit failures (SASS, Aesthetics, Length, FSM, Types, Lint) allowed in any commit.
- **DATABASE & REMOTE SYNCHRONIZATION ALERT**: Display a prominent warning at the very end of your response informing the user they must push and update the database schemas on the servers. Provide these commands:

  ```bash
  # Push changes to remote
  git push origin main

  # Update database on a specific server
  npm run servers:db:update -- --server=<profile>

  # Update database on all configured servers
  npm run servers:db:update -- --all
  ```

---

## Commit Message Standards

See [commit-standards.md](./references/commit-standards.md) for the full Elegant Protocol, the dual-commit strategy, the gold standard example, and the list of forbidden patterns.

**Quick reference — forbidden patterns:**

- Single-word messages (`commit`, `update`, `fix`).
- Messages without a bulleted list for changes involving 2+ files.
- Vague descriptions like "minor changes" without specifying the technical "what".

---

## Example Recovery Strategy

**Correct behavior after a fix:** "Fixed lowercase filter collision in `MapCard.vue`. **Workflow Projection**:

1. [ ] Re-run `npm run audit:full` (Step 3).
2. [ ] Run `npm run build` to verify compilation (Step 3.5).
3. [ ] Workspace Cleanup (Step 6).
4. [ ] Walkthrough Generation (Step 7).
5. [ ] DOX Maintenance & Audit (Step 7.1).
6. [ ] Extract lessons (Step 8). **Wait for 🛑 Lesson Approval**.
7. [ ] **Wait for ✅ Skill Implementation Verification** (Step 8.2).
8. [ ] Final Optimization Commit (Step 9)."

---

## ⚠️ Anti-Shortcut Policy

- **No Phase-Jumping**: It is strictly forbidden to execute Steps 9 or 10 if Steps 1–8 are not fully documented and checked in the **task**.
- **Test Implementation Check**: You are FORBIDDEN from committing if there are identified "Missing Tests" in Step 2 that haven't been implemented and marked as `[x]`.
- **Contextual Review**: Before each tool call in the verification cycle, ask yourself: "Is my task updated with the result of the *previous* tool call?". If not, update it first.
