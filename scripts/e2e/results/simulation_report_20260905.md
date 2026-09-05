# Simulation Run — 2026-09-05

## Summary
- Total: 44 suites | 482 tests | 482 passed | 0 failed | 0 skipped
- Drivers: Dual Engine (SQLite in-memory + PostgreSQL Docker on RAM tmpfs)
- Result: 100% DUAL PASS

## Failures Fixed
| Simulation | Root Cause | Fix Applied in src/ | Attempts |
|---|---|---|---|
| FIX-41 (Events) | Competition query missing descending order | Added `.order('ended_at', { ascending: false })` | 1 |
| FIX-42 (Events UI) | Duplicate ID in DOM | Added `idPrefix` prop to `EventCard.vue` | 1 |
| FIX-43 (Events) | Awards accumulation | Purged awards in `BaseEventSimulation.setup()` | 1 |
| FIX-44 (GTS) | Dev server memory buffer leak | Added `cleanupSimulationDb` | 1 |
| FIX-45 (Logging) | Playwright reporter offset counting error | Fixed `completedTests` counter | 1 |
| FIX-46 (Network) | Linux virtual network interface churn | Implemented `isTransientNetworkError` with retries | 1 |
| FIX-47 (Combat) | Multi-turn locked moves single move array | Added single slot normalization in `showdownMoveChoiceHelper.ts` | 1 |
| FIX-48 (Harness) | 20s mounting overhead | Implemented `WorkerSessionPool` and 7-pillar reset | 1 |
| FIX-49 (Checkpoint) | Checkpoint erased on suite pass | Removed `doc.master` nullification in `clearSuiteCheckpoint` | 1 |
| FIX-50 (Logging) | Lack of visual divider lines | Added visual divider lines and updated `isProgressLog` | 1 |

## Failures Requiring User Review (structural)
None.

## Regressions Detected
None. All 44 suites pass cleanly in dual mode.

## Fuzzer Coverage
- Moves tested: 863/863
- Items tested: 169/169
- Abilities tested: 312/312

## Coverage Gaps Detected
None.
