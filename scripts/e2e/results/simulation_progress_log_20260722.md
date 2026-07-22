# Simulation Run — 2026-07-22
Session: 4e218c

## Scope
Full game & combat simulation suite (`sim:combat:all:report`) with dynamic multi-core worker allocation (`workers: '25%'`).

## Status
Overall: IN_PROGRESS
Last action: Running `npm run sim:combat:all:report` (Task task-5330)
Resumed at: sim:combat:all:report

## Simulation Queue
- [x] test:node (unit) — PASS (185 test files, 4115 tests)
- [x] sim:fuzzer (certified cases generation) — PASS
- [/] sim:combat:all (Playwright multi-core simulation suite) — IN PROGRESS

## Active Fix — battle_fsm_sync
Root cause: Defer active enemy assignment during FSM animations to prevent sprite mutation.
Files touched: `src/logic/battle/showdownBridgeMisc.ts`, `src/logic/battle/battleFaintSequence.ts`, `scripts/e2e/e2e_helpers.ts`, `playwright.config.ts`
Attempts: 1
Status: PENDING_FULL_RUN

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| battle_fsm_sync | Instant enemy sprite swap on switch log | Add `isFsmAnimActive` guard to defer assignment | 1 | PASS |
| e2e_login | Timeout waiting for #server-tab-local | Add `domcontentloaded` wait and resilient click | 1 | PASS |
| worker_config | Core restriction to static 4 workers | Restore `workers: '25%'` for dynamic multi-core parallelism | 1 | PASS |

## Pending Simulations (not yet started)
None

## Structural Blockers (user review required)
None

## Critical Decisions
- Restored dynamic CPU worker allocation (`workers: '25%'`) to utilize all hardware cores.

## Coverage Gaps Detected
None
