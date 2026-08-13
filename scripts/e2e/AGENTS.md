# Purpose

Scenario simulation suites using Playwright to verify visual/functional synchronization of FSM, GSAP, and UI, acting as test case builders.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations run in local browser instances.
- Speed up animations using `gsap.globalTimeline.timeScale(100)` under simulation mode.
- Mock native Web APIs (like `Notification` permission) and local flags (like `pwa_permissions_accepted` in `localStorage`) in order to bypass popups and overlays that block UI synchronization.
- **Certified Fuzzer Replay Termination Contract**: An E2E replay consumes the atomic `history` cursor until every certified submission has been accepted by the worker and the worker has ended. The legacy flat choice arrays are validated projections only and MUST NOT control termination. The simulation then validates 1:1 state parity (`lastFinalState` vs `batch.finalState`). Matching state parity guarantees clean simulation completion (PASS).
- **Certified Combat Source Contract**: Every Playwright test that enters combat MUST use a current fuzzer-certified case and reproduce its immutable seed, `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the shared `ShowdownBattleRunner`. A manually constructed battle or a real-AI decision stream is invalid for browser combat; generate a legal objective-driven fuzzer case first. This does not apply to non-combat domain simulations.
- **Absolute Prohibition on Simulation Bypasses**: It is STRICTLY FORBIDDEN to add bypasses, silent catch blocks, exception swallowing, or mock workarounds in E2E simulations or replayers solely to make tests "pass". Any error during simulation is an empirical indicator of a real synchronization failure, missing implementation, or codebase bug in `src/`. The root cause in `src/` MUST be diagnosed and fixed at the source—never hidden, swallowed, or ignored.
- **Genuine UI Interaction Contract**: Apart from initializing a current fuzzer-certified battle and applying its recorded IPB healing flags, simulations must perform every gameplay interaction through the visible official UI. Stores, composables, debug methods, DOM event dispatchers, and browser-side delegates may be used only for read-only diagnostics, never to close, confirm, move, select, switch, flee, or exit.
- **Mandatory 100% Shared Code via Modular Inheritance & Polymorphism**: Headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E browser simulations MUST import and execute the LITERALLY SAME shared battle execution module (`showdownExecutor.ts`, `showdownBattleRunner.ts`). Code duplication, parallel implementations, or divergent choice handling logic between headless replayers and browser simulations are strictly forbidden. All battle execution logic must be extracted into single, reusable generic functions and base classes.
- **Atomic Certified History Contract**: All fuzzer-generated battle histories (`fuzzer_certified_cases.json`) MUST persist one typed atomic action record per turn, including native choices, optional game actions, and IPB flags. The legacy flat choice arrays are derived compatibility projections only. Standalone `cheats` arrays and index-based timing maps are strictly forbidden.
- **Mandatory Clean Fuzzer Regeneration Contract**: `ensure_fuzzer_cases.ts` and `npm run sim:fuzzer` MUST clean-wipe all existing fuzzer outputs (`fuzzer_*.json`, `fuzzer_*.txt`, `fuzzer_certified_cases.json`) in `scripts/e2e/results/` before starting, forcing a clean generation from scratch by default.
- **Single-Writer Sequential File Queue Contract**: Direct disk writes via `fs.writeFile` in simulation suites and fuzzer engines are STRICTLY FORBIDDEN. All test artifact and report disk writes MUST be dispatched through `fileWriterQueue.safeWriteFile` ([fileWriterQueue.ts](./helpers/fileWriterQueue.ts)) to guarantee single-writer FIFO execution and atomic temporary file swapping (`.tmp` -> `rename`), preventing Windows OS file lock collisions across concurrent processes.
- **Canonical Move & Virtual Pseudo-Move Contract**: All moves (including Showdown synthetic pseudo-moves like `struggle` and `recharge`) MUST be registered in `src/data/battle/moves.json` and resolved through `pokemonDataProvider.getMoveData(id)`. Implementing inline hardcoded checks or fallback objects for individual move IDs in components or composables is strictly prohibited.
- **Natural Battle Execution & Temporary Cheats Deactivation Contract**: Fuzzer battle execution MUST operate in two mandatory sequential phases: (1) Cheat-Assisted Testing while moves/abilities are untested, and (2) Natural Unassisted Combat Completion as soon as all items in the batch are certified PASS. Cheats MUST be disabled, and the battle MUST continue turn-by-turn until it ends organically (`simBattle.ended === true`). Artificial loop breaks, early returns, or synthetic truncations are STRICTLY FORBIDDEN.

## Work Guidance

- Run the simulation suite locally using `npm run sim:e2e` (which dynamically discovers every `*.simulation.ts` file under `scripts/e2e/` and executes them one by one in strict sequential order).
- For detailed instructions on executing simulations, resolving failures, and following the debugging protocol, refer to the [Validation Manual](../../.agents/skills/project-standards/references/qa/validation_manual.md).
- Ensure the local Vite development server is configured (default for E2E simulations is `http://localhost:5174`) before running the simulations. Playwright will automatically start the dev server on port 5174 if it is not already running.
- **Concurrency Limit and Timeouts**: When running heavy parallel simulations in the browser, set a reasonable maximum number of concurrent processes (e.g. `workers: 4`) and an elevated simulation timeout (`test.setTimeout(120000)`) to prevent false failures caused by CPU congestion on the local development server.
- **Complete Combat Lifecycle**: Battle flow simulations (such as using Potions, Pokéballs, or Revives) must never be truncated early. They must automatically run turn-by-turn until the battle is fully completed (victory or defeat), as FSM desynchronizations or state side effects typically manifest in the turns following the action, not in the immediate turn.
- **Safe Interaction with Quick Inventory**: When clicking items in the battle quick bag, always wait for the card to be active (without the `.is-disabled` class) to ensure that introduction animations have completed and prevent properties like `pointer-events: none` from blocking the click.
- **Strict Parity Assertions (Showdown vs DOM)**: Validate turn-by-turn that the HP and status effects in the DOM match the logical values in the Pinia store (driven by Showdown). For healing or reviving items, explicitly verify that the HP values increase logically to discard scenarios where the client consumes the item but the Showdown engine silently ignores the action.
- **Dynamic Switch Slot Mapping**: In Pokémon Showdown, the "switch X" command is dynamic and relative to the active request's Pokémon list (where the active Pokémon goes to slot 1 and the bench rotates). Therefore, the replayer MUST resolve the target UID by dynamically searching within the `playerRequest.side.pokemon` array instead of using the static `p1SlotOrder` array.
- **No Browser-Side State Drivers**: Browser-side `page.evaluate()` is diagnostic-only and `page.waitForFunction()` is forbidden. Never dynamically import stores or call gameplay helpers from the browser test context; add a typed source event and use the official visible control instead.
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

- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [fuzzer/](./fuzzer/AGENTS.md): Domain module documentation for fuzzer.
- [gts/](./gts/AGENTS.md): Domain module documentation for gts.
- [gyms/](./gyms/AGENTS.md): Domain module documentation for gyms.
- [logging/](./logging/AGENTS.md): Domain module documentation for OOP logging framework (`BaseRunnerLogger`, `FuzzerRunnerLogger`, `SimulationRunnerLogger`).
- [missions/](./missions/AGENTS.md): Domain module documentation for missions.
- [results/](./results/AGENTS.md): Domain module documentation for results.
- [save/](./save/AGENTS.md): Domain module documentation for save.
