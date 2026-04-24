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
    Start((START)) --> Planning[1. Planning & Task Initialization]
    Planning --> |"Dynamic task.md update"| Planning
    Planning --> GapAnalysis[2. Test Gap Analysis]
    GapAnalysis --> |"Missing Tests Detected?"| CreateTests[2.1 Create Unit Tests SUB-TASK]
    CreateTests --> Verification[3. Active Verification Cycle]
    GapAnalysis --> Verification
    
    subgraph "The Zero-Warning Audit"
        Verification --> SASSCheck1[SASS Check]
        SASSCheck1 --> SASSFix[SASS Fixer]
        SASSFix --> SASSCheck2[SASS Final Check]
        SASSCheck2 --> Hybrid[Hybrid Guard]
        Hybrid --> Lint[Linting]
        Lint --> Types[Type-Safety]
        Types --> Build[Production Build]
        Build --> UnitTests[Unit Tests]
        UnitTests --> Modularity[500-Line Rule]
        Modularity --> Global[Global Compliance]
    end
    
    Global --> DBCheck{DB Changes?}
    DBCheck -->|Yes| DBSync[4. Database Parity Sync]
    DBCheck -->|No| Recovery[5. Failure Recovery]
    DBSync --> Recovery
    
    Recovery -->|FAIL| Verification
    Recovery -->|PASS| Cleanup[6. Workspace Cleanup]
    Cleanup --> Lessons[7. Lessons Extraction]
    Lessons --> Approval[7.1 User Approval]
    
    Approval --> Commit[8. The Safe Commit]
    Commit --> Push[9. Push & Close]
    Push --> End((END))
    
    style Start fill:#f9f,stroke:#333,stroke-width:4px
    style End fill:#f9f,stroke:#333,stroke-width:4px
    style Recovery fill:#ff9,stroke:#333,stroke-width:2px
    style Verification fill:#dfd,stroke:#333,stroke-width:2px
```

> [!IMPORTANT]
> **IMMUTABLE STEPS**: You MUST follow every step in this diagram. You are allowed to add intermediate sub-tasks for complex features, but you are FORBIDDEN from deleting or skipping any original design steps.

### 1. Planning & Task Initialization

Before writing any code or finalizing changes, analyze the work done.

- Create or update `task.md` in the agent's private directory. This file is your **source of truth**; use it to track every granular step.
- **Dynamic Updates**: If you discover new complex problems during the process, you MUST immediately add them as new items to `task.md` to ensure no requirement is forgotten.
- Verify that every change aligns with the **Hybrid Retro-Modern** identity.

### 2. Test Gap Analysis

Review all modified files in `src/logic/`.

- Identify any new logic (battle calculations, move effects, evolution logic) that lacks corresponding tests in `tests/unit/`.
- **MANDATORY SUB-TASK**: If a module or file lacks critical unit tests and it is "worthy" (worth the effort for stability), you MUST create a new unit test. Add this as a **SUB-TASK** in `task.md` immediately.
- **NEVER FORGET**: While adding tests, the general objective of committing clean, verified code must remain the priority.

### 3. Active Verification Cycle (The "Zero-Warning" Audit)

You MUST run these commands and fix EVERY issue until a clean pass is achieved.

> [!IMPORTANT]
> **Pre-existing Warnings**: If the audit (Lint, Types, SASS) reveals warnings or errors in files you did not modify, you ARE RESPONSIBLE for fixing them before committing. A "Safe Commit" means a 100% clean repository state, not just for your changes.

- **SASS Integrity Check**: `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` (Identify existing traps).
- **SASS Auto-Fix**: `python3 .agents/skills/project-standards/scripts/fix_sass_traps.py` (Run this to resolve common interpolation issues if the check fails).
- **SASS Integrity Final**: `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` (Ensure 100% compliance after fixing).
- **Hybrid Guard**: `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py`.
- **Linting**: `npm run lint` (Must return 0 errors and 0 warnings).
- **Type-Safety**: `npx vue-tsc --noEmit` (Crucial for detecting broken props or reactive refs).
- **Production Build**: `npm run build` (Ensures Vite can compile the project).
- **Unit Tests**: `npm run test` (MANDATORY: All tests must pass. If a single test fails, the commit process must stop).
- **Modularity Check**: Audit files for the **500-line rule**. If any file you touched exceeds this limit, you MUST refactor it now (Exceptions: Data-heavy definition files/pseudo-databases).
- **Global Compliance**: Verify absolute adherence to all rules in @/project-standards, including Hybrid identity and Navigation Hub references.

### 4. Database Triple Parity Sync

If the database schema has changed:

1. Verify the SQL migration exists in `database/migrations/`.
2. Verify the Vite plugin has regenerated `src/logic/db/migrations_data.js`.
3. Verify the absolute schema in `database/schemas/` is updated.
4. **Local Sync**: If testing locally, ensure the WASM SQLite engine is initialized correctly with the new delta.

### 5. Failure Recovery & Workflow Projection

- If any check fails, fix the issue and **RE-START Step 3**. A fix for a lint error might break a build or introduce a SASS trap.
- > [!CAUTION]
  > **STOP ON FAILURE**: If something does not work or a test fails, you MUST fix it immediately. It is forbidden to proceed to the next step or attempt the commit if the verification cycle is not perfect.
- > [!IMPORTANT]
  > **WORKFLOW PROJECTION**: After any fix or test creation, you MUST explicitly update `task.md` and list the REMAINING steps. Do not stop until the verification cycle returns 100% success and all tasks (including newly discovered sub-tasks) are completed.

### 6. Workspace Cleanup (MANDATORY)

Before extracting lessons or committing, you MUST delete all temporary artifacts created during the development or verification process.

- Delete files in `<appDataDir>/brain/<conversation-id>/scratch/` if they are no longer needed.
- Delete any ad-hoc test files (e.g., `test_output.txt`, `tmp_log.json`) created in the root or subdirectories.
- **Audit Cleanup**: Delete all `.txt` files related to auditing (generally containing `_audit_` in the name, like `audit_results.txt` or `gpu_audit_results.txt`).
- Ensure `git status` does not show untracked temporary files that should not be in the repository.

### 7. Lessons Extraction (LOCAL)

Run **@/extract-lessons** to capture patterns (e.g., a new SASS trick or a Phaser optimization). This is a **local documentation task** and MUST NOT involve a browser subagent.

- **Feedback Mandatory**: After @/extract-lessons presents the lesson mapping table, you MUST stop and wait for the user to approve the changes.
- **NEVER COMMIT BLINDLY**: It is strictly forbidden to proceed to Step 8 without explicit user confirmation of the extracted lessons.

### 8. The Safe Commit

1. `git status` to verify all files (including docs and `.agents/skills/` updates) are staged.
2. `git add .`
3. Commit with a message following conventional standards (`feat:`, `fix:`, `refactor:`, `docs:`).

### 9. Push & Close

Push changes and notify the user.

## Commit Message Standards

- Be descriptive: `feat(battle): add burn effect calculation and unit tests`
- Reference completed tasks from `task.md`.

## Example Recovery Strategy

**Correct Behavior after a fix:**
"Fixed lowercase filter collision in `MapCard.vue`.
**Workflow Projection**:

1. [ ] Re-run `check_sass_traps.py` (Step 3).
2. [ ] Run `npm run build` to verify compilation.
3. [ ] Workspace Cleanup (Step 6).
4. [ ] Extract lessons (Step 7).
5. [ ] **Wait for User Approval** (Step 7.1).
6. [ ] Git commit & push (Step 8).
"
