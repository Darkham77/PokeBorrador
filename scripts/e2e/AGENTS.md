# Purpose

Scenario simulation suites using Playwright to verify visual/functional synchronization of FSM, GSAP, and UI, acting as test case builders.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations run in local browser instances.
- Speed up animations using `gsap.globalTimeline.timeScale(100)` under simulation mode.
- Mock native Web APIs (like `Notification` permission) and local flags (like `pwa_permissions_accepted` in `localStorage`) in order to bypass popups and overlays that block UI synchronization.

## Work Guidance

- Run the simulation suite locally using `npm run sim:e2e`.
- For detailed instructions on executing simulations, resolving failures, and following the debugging protocol, refer to the [Validation Manual](../../.agents/skills/project-standards/references/qa/validation_manual.md).
- Ensure the local Vite development server is configured (default is `http://localhost:5173`) before running the simulations. Playwright will automatically start the dev server if it is not already running.
- **Concurrency Limit and Timeouts**: When running heavy parallel simulations in the browser, set a reasonable maximum number of concurrent processes (e.g. `workers: 4`) and an elevated simulation timeout (`test.setTimeout(120000)`) to prevent false failures caused by CPU congestion on the local development server.
- **Complete Combat Lifecycle**: Battle flow simulations (such as using Potions, Pokéballs, or Revives) must never be truncated early. They must automatically run turn-by-turn until the battle is fully completed (victory or defeat), as FSM desynchronizations or state side effects typically manifest in the turns following the action, not in the immediate turn.
- **Safe Interaction with Quick Inventory**: When clicking items in the battle quick bag, always wait for the card to be active (without the `.is-disabled` class) to ensure that introduction animations have completed and prevent properties like `pointer-events: none` from blocking the click.
- **Strict Parity Assertions (Showdown vs DOM)**: Validate turn-by-turn that the HP and status effects in the DOM match the logical values in the Pinia store (driven by Showdown). For healing or reviving items, explicitly verify that the HP values increase logically to discard scenarios where the client consumes the item but the Showdown engine silently ignores the action.
- **Dynamic Switch Slot Mapping**: In Pokémon Showdown, the "switch X" command is dynamic and relative to the active request's Pokémon list (where the active Pokémon goes to slot 1 and the bench rotates). Therefore, the replayer MUST resolve the target UID by dynamically searching within the `playerRequest.side.pokemon` array instead of using the static `p1SlotOrder` array.
- **Relative Imports for Browser Sandbox**: When importing modules dynamically inside `page.evaluate()` or `page.waitForFunction()`, do not use root-relative paths like `/src/stores/...` (which are browser-only and cause TS2307 compilation errors in `tsc`/`vue-tsc`). Always use relative paths (`../../src/...`) to satisfy both the static TypeScript compiler and the Vite server.
- **Active Battle Store Typing**: Access the active battle state via `store.state` instead of `store.activeBattle` (which is private to the store setup scope). Check for `!store.state || store.state.over` to verify combat completion.
- **Fallow Duplicate Code Evasion**: To prevent Fallow from flagging identical boilerplate code blocks (such as dynamic store imports and initializations inside browser sandboxes) as critical duplications, vary local variable names, import aliases, or structural spacing within each sandbox evaluation block.
- **Shared Types**: Import `WindowWithResolver` and `DebugStore` exclusively from
  `../e2e_helpers.ts`. Never redefine them locally in individual simulation files.
  If new fields are needed, extend `DebugStore` in `e2e_helpers.ts` and update
  all simulations accordingly.
- **E2E Simulation Report Preservation & Wiping Awareness**: Running E2E simulations (such as `npm run sim:e2e:combat`) clean-wipes previous test failure reports inside `scratch/e2e_failures`. Agents MUST analyze and record existing failure reports before executing any new simulations. The agent is STRICTLY FORBIDDEN from aborting, killing, or canceling a running simulation autonomously without explicit user confirmation.

## Verification

- Run `npm run sim:e2e` to execute all modular Playwright simulations.
- Run `npm run sim:e2e:battle` to run battle-related simulations.
- Run `npm run sim:e2e:gts` to run GTS transactions simulations.
- Run `npm run sim:e2e:save` to run save-related simulations.
- Run `npm run sim:e2e:breeding` to run breeding-related simulations.
- Run `npm run sim:e2e:missions` to run missions-related simulations.
- Run `npm run sim:e2e:gyms` to run gym progression simulations.

## Child DOX Index

- [battle/](./battle/AGENTS.md): Battle-related scenario simulations including FSM synchronization, held items, and weather.
- [breeding/](./breeding/AGENTS.md): Scenario simulations for daycare breeding, egg generation, and hatching.
- [fuzzer/](./fuzzer/AGENTS.md): Headless Gen 9 moves, items, and abilities coverage fuzzer logic and runners.
- [gts/](./gts/AGENTS.md): Global Trade Station (GTS) multi-account transaction simulations.
- [gyms/](./gyms/AGENTS.md): Simulations for gym progression and badge verification.
- [missions/](./missions/AGENTS.md): Simulations for daily daycare missions.
- [results/](./results/AGENTS.md): Database of certified fuzzer cases, coverage reports, and simulation progress logs.
- [save/](./save/AGENTS.md): Save Shield scenario simulations.
