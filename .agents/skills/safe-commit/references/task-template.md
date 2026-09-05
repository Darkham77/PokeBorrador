# Safe Commit Task Ledger

> Location: `<appDataDir>/brain/<conversation-id>/task.md`
> Status: IN_PROGRESS

---

## Task Progress Checklist

- [ ] **Phase 0: Mandatory Artifact Initialization**
  - [ ] Write `<appDataDir>/brain/<conversation-id>/task.md` with complete checklist
  - [ ] Note scratch directory path: `<appDataDir>/brain/<conversation-id>/scratch/`
- [ ] **Phase 1: Test Gap Analysis & Zero-Commit Safety Backup**
  - [ ] `git status` & `git diff` review (Inspect changes and session artifacts)
  - [ ] Test Gap Analysis (Audit non-trivial logic for unit tests in `tests/unit/` / `tests/node/`)
  - [ ] `npm run fallow:health` (Record BASELINE_HEALTH)
  - [ ] Code-Only Safety Backup (`git diff HEAD -- '*.ts' '*.vue' '*.js' '*.scss' '*.css' 'database/**/*.sql' ':!*.json' > scratch/backups/pre_audit_backup.patch`)
  - [ ] Pre-draft commit message (The Elegant Protocol synthesis in `task.md`)
- [ ] **Phase 2: Active Verification & Repair Loop 🔁 (Exits ONLY on `npm run build` Exit Code 0)**
  - [ ] **Loop Cycle Checks (Must ALL pass consecutively on final code)**:
    - [ ] `npm run audit:for-commit` (0 errors, 0 new warnings)
    - [ ] `npm run test` (100% test suites passing)
    - [ ] `npm run build` 🔒 **THE BUILD GATE** (STRICT Exit Code 0 — zero bypasses)
    - [ ] Build Optimization & Data Compression Analysis (Inspect Brotli/Gzip tables, chunk sizes, manualChunks, and PWA caching budgets)
    - [ ] `npm run fallow:health` (Score ≥ 85 and ≥ BASELINE_HEALTH)
    - [ ] *(If DB changed)* Database Parity Sync verified
  - [ ] **Loop Repair Action (Triggered on ANY failure above; repeat until build exits 0)**:
    - [ ] `npm run audit:fix` (auto-repairs) & Manual code fixes applied in workspace
    - [ ] Re-run cycle checks until `npm run build` returns exit code 0
- [ ] **Phase 3: Unified DOX, Lessons Extraction & 🛑 Hard Stop**
  - [ ] DOX Maintenance (`AGENTS.md` updated via `/dox-navigator`)
  - [ ] Extract lessons via `/learn-with-docs`
  - [ ] Create `<appDataDir>/brain/<conversation-id>/learning_proposal.md`
  - [ ] Create/Update `<appDataDir>/brain/<conversation-id>/walkthrough.md`
  - [ ] Workspace cleanup (Clean temporary files from `scratch/`)
  - [ ] Call `ask_question` for user approval
  - [ ] 🛑 HARD STOP (Wait for approval before Phase 4)
- [ ] **Phase 4: Single Atomic Certified Commit & Completion**
  - [ ] Apply approved lessons to `AGENTS.md`
  - [ ] Synthesize final Elegant Protocol commit message (feature + tests + audit fixes + DOX)
  - [ ] `git add .` & `git commit -m "<message>"` (Single Atomic Certified Commit)
  - [ ] Display push status or instructions & db update commands
  - [ ] Mark Phase 4 `[x]`

---

## Step Records & Execution Metrics

### Workspace Safety Backup
- **Modified Files**:
  - `(none recorded yet)`
- **Safety Patch File**: `scratch/backups/pre_audit_backup.patch`
- **Baseline Fallow Health**: `BASELINE_HEALTH = UNSET`
- **Pre-Drafted Commit Message**:
  - `(drafted in Step 1.4)`

### Verification & Repair Loop Status
- **Loop Iteration Count**: `0`
- **audit:for-commit**: `PENDING`
- **test**: `PENDING`
- **npm run build (THE GATE)**: `PENDING (MUST BE EXIT 0)`
- **build_compression_and_optimizations**: `PENDING (Brotli/Gzip savings & chunk health verified)`
- **final fallow health**: `PENDING`
- **Repairs Applied**:
  - `(none yet)`
