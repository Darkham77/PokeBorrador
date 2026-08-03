# Simulation Run — 2026-08-02

Session: 19511d

## Scope

Unify fuzzer generation, headless replay, and Playwright battle replay so every certified choice and heal event is consumed identically.

## Status

Overall: IN_PROGRESS
Last action: Browser combat suite reached E2E bootstrap and failed before any certified turn executed.
Resumed at: Isolate login/bootstrap failure in batch 4

## Simulation Queue

- [x] sim:fuzzer — PASS (86/86 certified scenarios before this session)
- [ ] sim:e2e:combat — IN_PROGRESS
- [ ] sim:e2e:ai — PENDING
- [ ] sim:e2e:gyms — PENDING
- [ ] sim:e2e:gts — PENDING
- [ ] sim:e2e:breeding — PENDING
- [ ] sim:e2e:missions — PENDING
- [ ] sim:e2e:save — PENDING
- [ ] sim:e2e — PENDING

## Active Fix — sim:e2e:combat

Root cause: Replay enabled threshold-based IPB instead of applying certified history; missing certified choices became silent passes.
Files touched: `showdownBattleEngine.ts`, `showdownBattleRunner.ts`, `showdownExecutor.ts`, `showdown.worker.ts`, `showdownWorkerClient.ts`, `base_battle_simulation.ts`, and focused tests.
Attempts: 1
Status: BLOCKED_BY_BOOTSTRAP_FAILURE

## Completed Fixes

| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| Unit: replay IPB | Automatic healing changed certified replay state | Replay now applies only `BattleCheatManager` history; automatic IPB is fuzzer-only | 1 | PASS |
| Unit: choice stream | Missing required choice silently returned `pass` | Runner and engine throw with seat/index context | 1 | PASS |
| Headless: `case-2ac60b697ebb` | Replayer had a separate automatic-heal path | Certified 98-turn trace passed using only history events | 1 | PASS |
| Browser combat | Login did not reach `#nav-map-btn`; no certified replay turn ran | Pending isolated batch 4 trace | 1 | FAILED |

## Structural Blockers

| Simulation | Why a design decision is needed |
|---|---|
| sim:e2e:combat | Browser startup previously failed before cases executed with `net::ERR_NAME_NOT_RESOLVED`; recheck after headless verification. |
