# Simulation Run — 2026-07-07

Session: 153000

## Scope

- Resolve E2E combat simulation desync hang in case `case-006487488a68` around Turn 100 / ChoiceIndex 126.
- Fix TypeScript compiler warnings and lint rules after recent refactoring.
- Resolve HP desynchronization in E2E combat simulation batch #25 by sharing `syncRequestConditionsWithSimulator` and running the moves fuzzer correctly.
- Fix native execution of fuzzer scripts using the `tsx` loader integration (`node --import tsx`) instead of adding `vite-node` dependency or custom symlinks.

## Status

Overall: IN_PROGRESS
Last action: Running the full E2E simulation suite over the newly regenerated certified cases.

## Simulation Queue

- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [/] sim:e2e:combat — IN PROGRESS (Full execution of fuzzer cases in Playwright)

## Active Fix — HP desynchronization in batch #25

### Root Cause
1. In the fuzzer engine, when a cheat heals a Pokémon, the request conditions inside `activeRequest` were not being updated.
2. In the browser, the conditions were updated properly.
3. This led to a divergence in HP values at the end of the combat.
4. The fuzzer command `npm run sim:fuzzer` failed under native Node because of `@/` path aliases and extensionless relative imports inside shared files like `showdownBridge.ts`.

### Fix Applied
- **cheats.ts**: Moved and exported `syncRequestConditionsWithSimulator` from `showdown.worker.ts` so it is shared.
- **showdown.worker.ts**: Imported `syncRequestConditionsWithSimulator` from `cheats.ts`.
- **fuzzer_engine.ts** & **fuzzer_case_replayer.ts**: Imported and called `syncRequestConditionsWithSimulator` right after applying healing cheats.
- **package.json**: Replaced `--experimental-strip-types` with `--import tsx` in fuzzer scripts to enable native Node path and extension resolution. Added `tsx` to `devDependencies`.

## Completed Fixes

| Simulation | Root Cause | Fix Applied | Attempts | Result |
| --- | --- | --- | --- | --- |
| case-006487488a68 | FSM stuck in switch menu after post-turn healing cheat | Added FSM state recovery for revived active Pokémon | 1 | PASS |
| batch #25 | Fuzzer engine HP desync due to missing request condition sync | Shared and invoked `syncRequestConditionsWithSimulator` in fuzzer engine | 1 | PASS |

## Pending Simulations

- Complete full E2E battle simulation suite validation.
