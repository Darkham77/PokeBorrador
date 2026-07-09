# Simulation Run — 2026-07-08

Session: 230000

## Scope

- Migrate all `tests/node/` test files (39) from `node:test` to Vitest (vite-node), unifying the test runner.
- Create `external/` directory for read-only reference codebases (`pokemon-showdown-code/`, `pokemon-showdown-ai/`) and exclude them from all project tooling.
- Repair 8 pre-existing unit test failures in battle AI and switch/turn logic.
- Improve AI architecture: refactor `StandardAI`, `ScriptedAI`, and `CombatAI` into dedicated modules under `src/logic/battle/ai/`.

## Status

Overall: IN_PROGRESS
Last action: Unit + integration test suite fully green (3977/3977). Vitest migration complete. Pending: E2E combat Playwright simulation resumption.
Resumed at: E2E validation (was IN_PROGRESS from 2026-07-07 session)

## Simulation Queue

- [x] test:node (Vitest node env) — PASS (695 tests, 43 files)
- [x] test:unit (Vitest jsdom env) — PASS (3282 tests, 118 files)
- [x] test (full suite) — PASS (3977 tests, 161 files)
- [/] sim:e2e:combat — PENDING RESUMPTION (was IN_PROGRESS from previous session)

## Active Fix — Battle AI Module Split & Test Mock Alignment

### Root Cause

After the battle AI refactor (`StandardAI`, `ScriptedAI`, `CombatAI` interface), unit tests for these modules were failing because:

1. **Module mock mismatch**: `switchAction.ts`, `battleTurn.ts`, and `resolution.ts` dynamically import from `showdownWorkerClient.ts`, but tests only mocked `@/logic/battle/orchestrator`. Vitest does not intercept one module's mock when code imports from a different (but re-exporting) module.

2. **Enemy request read path**: `StandardAI.decideMove` was reading `enemyRequest` from `store.activeBattle.value.enemyRequest`, but tests set it via `useBattleStore().state.enemyRequest` without passing a `store` arg.

3. **`findBestSwitchIndex` signature drift**: `processFaint` now passes `ctx` as the optional 4th arg, but test assertion did not account for it.

### Fix Applied

- **`standardAI.ts`**: Added `useBattleStore()` fallback for `enemyRequest` when `store?.activeBattle?.value?.enemyRequest` is undefined.
- **4 unit test files** (`switch_sync.spec.ts`, `test_switch_cleanup.spec.ts`, `npc_item_usage.spec.ts`, `npc_counter_switch.spec.ts`): Added `vi.mock('@/logic/battle/showdownWorkerClient', ...)` and `vi.mock('@/logic/battle/showdownBridge', ...)` to intercept the real dynamic imports.
- **`switch_sync.spec.ts`**: Changed dynamic import for `mockRejectedValueOnce` from `orchestrator` to `showdownWorkerClient` (the actual source).
- **`npc_counter_switch.spec.ts`**: Updated assertion to include `expect.anything()` for the optional `ctx` arg.

### Status: PASS (8/8 previously failing tests now pass)

## Completed Fixes

| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| case-006487488a68 | FSM stuck in switch menu after post-turn healing cheat | Added FSM state recovery for revived active Pokémon | 1 | PASS |
| batch #25 | Fuzzer engine HP desync due to missing request condition sync | Shared `syncRequestConditionsWithSimulator` in fuzzer engine | 1 | PASS |
| case-3355ddbe6885 | Click intercepted by Vue DOM race condition on controls lock | Wait for `is-ui-locked` class removal before input | 1 | PASS |
| `switch_sync.spec.ts` (3 tests) | Worker mock applied to wrong module (orchestrator vs. showdownWorkerClient) | Added `vi.mock('@/logic/battle/showdownWorkerClient')` to test | 1 | PASS |
| `test_switch_cleanup.spec.ts` (1 test) | Same worker mock mismatch | Same fix | 1 | PASS |
| `npc_item_usage.spec.ts` (1 test) | Same worker mock mismatch | Same fix | 1 | PASS |
| `npc_counter_switch.spec.ts` (1 test) | `findBestSwitchIndex` called with ctx arg not in assertion | `expect.anything()` added | 1 | PASS |
| `npc_ai_disabled_moves.spec.ts` (2 tests) | `StandardAI` read `enemyRequest` from wrong source | `useBattleStore()` fallback added | 1 | PASS |

## Infrastructure Changes This Session

| Change | Impact |
|---|---|
| `tests/node/**` migrated from `node:test` → Vitest | Unified runner; cache support via `.vitest-cache/` |
| `vitest.config.ts` + `vitest.node.config.ts` created | Workspace project pattern for jsdom + node envs |
| `external/` directory created | `pokemon-showdown-code/` and `pokemon-showdown-ai/` moved here |
| `external/` excluded from ESLint, Fallow, Vitest coverage, audit | Clean tooling isolation |
| `.gitignore` — removed `external/` entries | Reference codebases are now git-tracked |

## Pending Simulations

- Resume `sim:e2e:combat` full Playwright suite validation.
- Verify that the AI refactor (StandardAI / ScriptedAI split) does not regress any E2E battle cases.

## Coverage Gaps Detected

| Gap | Suggested simulation type |
|---|---|
| `ScriptedAI` branches (E2E mock replay paths) | Already covered by E2E combat simulation with `__VITE_DEBUG__` mock choices |
| `StandardAI.evaluateAndUseItem` item usage in real battles | `sim:e2e:combat` trainer battles |
