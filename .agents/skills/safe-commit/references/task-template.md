# Safe Commit Task Ledger

> Location: `<appDataDir>/brain/<conversation-id>/task.md`
> Status: IN_PROGRESS

---

## Task Progress Checklist

- [ ] **Phase 0: Mandatory Artifact Creation**
  - [ ] Write `<appDataDir>/brain/<conversation-id>/task.md` with complete checklist
  - [ ] Note scratch directory path: `<appDataDir>/brain/<conversation-id>/scratch/`
- [ ] **Phase 1: Initial Snapshot Commit**
  - [ ] `git status` (Record modified/untracked files)
  - [ ] `git diff` & Session Artifacts Review (Review full diff + inspect session artifacts in `<appDataDir>/brain/<conversation-id>/`)
  - [ ] AGENTS.md chain review
  - [ ] `npm run fallow:health` (Record BASELINE_HEALTH)
  - [ ] Compose commit message (The Elegant Protocol synthesis)
  - [ ] `git add .`
  - [ ] `git commit -m "<message>"`
- [ ] **Phase 2: Test Gap Analysis**
  - [ ] Audit modified files for missing unit tests (`tests/unit/` / `tests/node/`)
  - [ ] Implement required missing tests (if applicable)
- [ ] **Phase 3: Active Verification Cycle — The Repair Loop**
  - [ ] 3.1 `npm run audit:warnings-diff`
  - [ ] 3.2 `npm run audit:fix`
  - [ ] 3.3 Autonomous Repair Discovery
    - [ ] Read `scratch/warnings_diff_report.txt`
    - [ ] `npm run audit:changed > scratch/fallow_report.txt`
    - [ ] Present Technical Debt Report
  - [ ] 3.4 Manual Repair Phase
  - [ ] 3.5a `npm run validate:types`
  - [ ] 3.5b `npm run test`
  - [ ] 3.5c `npm run build` (THE GATE - Exit Code 0)
  - [ ] 3.5d `npm run audit:warnings-diff` (Re-validation)
  - [ ] 3.5e `npm run fallow:health` (Must be ≥ BASELINE_HEALTH and ≥ 85)
- [ ] **Phase 4: Database Triple Parity Sync**
  - [ ] Schema change check / Migration sync (or skipped if no DB changes)
- [ ] **Phase 5: Failure Recovery**
  - [ ] Re-test loop reset if any fixing step touched source files
- [ ] **Phase 6: Workspace Cleanup**
  - [ ] Clean temporary reports from `scratch/`
  - [ ] Verify clean `git status` (no leftover debug files)
- [ ] **Phase 7: Walkthrough Generation**
  - [ ] Create/Update `<appDataDir>/brain/<conversation-id>/walkthrough.md`
- [ ] **Phase 7.1: DOX Maintenance (The DOX Pass)**
  - [ ] Invoke `/dox-navigator` skill to review & update `AGENTS.md` in touched directory trees
  - [ ] `npm run audit` (0 DOX errors)
- [ ] **Phase 8: Lessons Extraction & 🛑 Hard Stop**
  - [ ] Pre-lesson gate verification (Phases 0, 1, 2, 3, 4, 6, 7, 7.1 marked `[x]`)
  - [ ] Run `/learn-with-docs` skill
  - [ ] Create `<appDataDir>/brain/<conversation-id>/learning_proposal.md`
  - [ ] Call `ask_question` for user approval
  - [ ] 🛑 HARD STOP (Wait for approval before Phase 9)
- [ ] **Phase 9: Lesson Approval & Final Commit**
  - [ ] Apply approved lessons to `AGENTS.md` files
  - [ ] Request user confirmation for final commit
  - [ ] `git add .` & `git commit -m "docs(agents): ..."`
- [ ] **Phase 10: Final Status & Instructions**
  - [ ] Display push status or instructions (manual push for main, or automated for non-main development branches) & db update instructions
  - [ ] Mark Phase 10 `[x]`

---

## Step Records & Execution Metrics

### Workspace Snapshot
- **Modified Files**:
  - `(none recorded yet)`
- **Baseline Fallow Health**: `BASELINE_HEALTH = UNSET`

### Technical Debt Report & Repair Log
- **Audit Warnings/Errors**: `(pending 3.1)`
- **Fallow Issues**: `(pending 3.3b)`
- **Repairs Applied**:
  - `(none yet)`

### Verification Gate Log
- **validate:types**: `PENDING`
- **test**: `PENDING`
- **build**: `PENDING`
- **post-repair audit**: `PENDING`
- **final fallow health**: `PENDING`
