# Simulation Run — 2026-07-22
Session: 003700

## Scope
- Complete verification of E2E Simulation Pipeline (`search_loop_sequential.simulation.ts` and all domain suites).
- Enforcement of **Mandatory ID-Based UI Selection Mandate** across `AGENTS.md`, `project-standards` (SKILL.md), and all Vue components and E2E simulation files.
- Erradication of all text-based UI queries (`has-text()`, `hasText`, string matching) in tests and simulations.
- Natural UI minigame handling (fast skip/lose via UI `.modal-close-btn` for `fishing` and `archaeology`).

## Status
Overall: COMPLETE
Last action: Full 10-battle sequential search loop simulation (`search_loop_sequential.simulation.ts`) passed 100% cleanly (10/10 battles) using pure ID locators.

## Simulation Queue
- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [x] sim:e2e:search_loop_sequential — PASS (10/10 battles, 100%)
- [x] sim:e2e:gyms — PASS (100%)
- [x] sim:e2e:breeding — PASS (100%)
- [x] sim:e2e:gts — PASS (100%)
- [x] sim:e2e:missions — PASS (100%)
- [x] sim:e2e:save — PASS (100%)
- [x] sim:e2e:ai — PASS (100%)
- [x] sim:e2e:combat — PASS (30/30 passed, 100%)

## Completed Fixes in this Session
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| Mandatory ID-Based UI Selection | Locators were querying UI by text content (`has-text("...")`), causing translation fragility and DOM detachment delays. | Updated `AGENTS.md` and `project-standards` (SKILL.md). Added unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#server-tab-local`, `#local-login-btn`, `#gts-tab-publish`, `#gts-tab-explore`, `#gts-publish-offer-btn`, `#gts-buy-btn-`, `#mission-card-`, `#debug-select-`) across Vue components and updated all E2E simulation files. | 1 | PASS |
| clickResilient (DOM Detachment) | Clicking buttons that trigger FSM transitions caused Playwright to retry 5 times upon receiving `detached` status. | Updated `clickResilient` in `e2e_helpers.ts` to return immediately when element detaches from DOM upon click. | 1 | PASS |
| confirmAndStartBattle | Trainer/Rival dialogue modals were not being confirmed by ID. | Updated `confirmAndStartBattle` in `e2e_helpers.ts` to query `#start-encounter-btn` and `#confirm-battle-btn`. | 2 | PASS |
| BattleArenaView (handleMinigameCancel) | Closing minigame modals with `.modal-close-btn` called `completeBattleFlow('map')`, exiting the search loop entirely. | Updated `handleMinigameCancel` in `BattleArenaView.vue` to call `completeBattleFlow('search')`, returning naturally to `SEARCH_PHASE`. | 1 | PASS |
| battleDebug.ts | 5s watchdog timer triggered false positives during GSAP intro animations (~4.5s). | Increased watchdog timer in `battleDebug.ts` to 15s. | 1 | PASS |

## Critical Decisions & Guidelines for Next Agent
1. **Mandatory ID-Based UI Selection**: NEVER query UI elements by text content (`has-text(...)` or regex labels) in Playwright tests or simulations. ALWAYS assign a unique HTML `id` attribute in the Vue template and query by `#id` or `[id^="..."]`.
2. **Strict English Naming in Codebase**: All variable names, comments, and identifiers in repository code (including `scripts/e2e/`) MUST be strictly in English. Spanish is reserved exclusively for user chat responses.
3. **No Store State Bypasses in Simulations**: All user interactions MUST be performed naturally via Playwright clicking UI elements (e.g., `#start-encounter-btn`, `.modal-close-btn`, `#move-btn-0`). Never force FSM state variables or store flags directly in `page.evaluate()` to bypass UI logic.
4. **Simulator is Oracle**: Never alter Showdown engine logic, PRNG, or turn counters manually in test scripts. The Showdown worker is the sole authoritative state engine.
5. **Physical Mirroring**: This progress file is mirrored at `scripts/e2e/results/simulation_progress_log_20260722.md`. Any agent taking over on another machine must read this file first before running simulations.
