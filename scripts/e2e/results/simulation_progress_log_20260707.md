# Simulation Run — 2026-07-07

Session: 153000

## Scope

- Resolve E2E combat simulation desync hang in case `case-006487488a68` around Turn 100 / ChoiceIndex 126.
- Fix TypeScript compiler warnings and lint rules after recent refactoring.
- Resolve HP desynchronization in E2E combat simulation batch #25 by sharing `syncRequestConditionsWithSimulator` and running the moves fuzzer correctly.
- Fix native execution of fuzzer scripts using the `tsx` loader integration (`node --import tsx`) instead of adding `vite-node` dependency or custom symlinks.
- Resolve E2E UI click interception in `case-3355ddbe6885` due to a race condition with Vue's asynchronous DOM updates of `.is-ui-locked`.

## Status

Overall: IN_PROGRESS
Last action: Running the full E2E simulation suite to verify all cases after fixing the UI lock race condition.

## Simulation Queue

- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [/] sim:e2e:combat — IN PROGRESS (Full execution of fuzzer cases in Playwright)

## Active Fix — E2E UI Lock Race Condition

### Root Cause
- Playwright attempted to click buttons immediately after the store reports `isProcessing` is false. However, Vue updates the DOM asynchronously. As a result, the `.battle-controls-layout` still retained the class `is-ui-locked` (which sets `pointer-events: none`) at the microsecond of the click, causing Playwright to report that `#move-panel` intercepted pointer events.
- Bypassing this via `{ force: true }` in E2E helper is strictly forbidden as it cheats the browser interaction checks and masks real UI state desyncs.

### Fix Applied
- **AGENTS.md**: Added strict rule under section 6 prohibiting force-clicking or bypassing actionability/pointer-event checks in tests.
- **e2e_helpers.ts**: Updated `handleBattleInput` to check if `.battle-controls-layout` has the class `is-ui-locked`. If it is locked, the input helper returns `false` to wait for the next FSM polling tick, allowing Vue to complete the DOM update before any click interaction is attempted.

## Completed Fixes

| Simulation | Root Cause | Fix Applied | Attempts | Result |
| --- | --- | --- | --- | --- |
| case-006487488a68 | FSM stuck in switch menu after post-turn healing cheat | Added FSM state recovery for revived active Pokémon | 1 | PASS |
| batch #25 | Fuzzer engine HP desync due to missing request condition sync | Shared and invoked `syncRequestConditionsWithSimulator` in fuzzer engine | 1 | PASS |
| case-3355ddbe6885 | Click intercepted due to Vue DOM race condition on controls lock | Wait for `is-ui-locked` class removal before attempting input | 1 | PASS |

## Pending Simulations

- Complete full E2E battle simulation suite validation.
