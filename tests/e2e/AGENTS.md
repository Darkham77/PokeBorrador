# Purpose

E2E testing suites using Playwright to verify visual/functional synchronization of FSM, GSAP, and UI.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright E2E tests run in local browser instances.
- Speed up animations using `gsap.globalTimeline.timeScale(1000)` under E2E testing mode.
- Mock native Web APIs (like `Notification` permission) and local flags (like `pwa_permissions_accepted` in `localStorage`) in order to bypass popups and overlays that block UI synchronization.

## Work Guidance

- Run the E2E test suite locally using `npm run test:e2e`.
- Ensure the local Vite development server is configured (default is `http://localhost:5173`) before running the tests. Playwright will automatically start the dev server if it is not already running.
- **Concurrency Limit and Timeouts**: When running heavy parallel tests in the browser, set a reasonable maximum number of concurrent processes (e.g. `workers: 4`) and an elevated test timeout (`test.setTimeout(120000)`) to prevent false failures caused by CPU congestion on the local development server.
- **Complete Combat Lifecycle**: Battle flow tests (such as using Potions, Pokéballs, or Revives) must never be truncated early. They must automatically run turn-by-turn until the battle is fully completed (victory or defeat), as FSM desynchronizations or state side effects typically manifest in the turns following the action, not in the immediate turn.
- **Safe Interaction with Quick Inventory**: When clicking items in the battle quick bag, always wait for the card to be active (without the `.is-disabled` class) to ensure that introduction animations have completed and prevent properties like `pointer-events: none` from blocking the click.
- **Strict Parity Assertions (Showdown vs DOM)**: Validate turn-by-turn that the HP and status effects in the DOM match the logical values in the Pinia store (driven by Showdown). For healing or reviving items, explicitly verify that the HP values increase logically to discard scenarios where the client consumes the item but the Showdown engine silently ignores the action.
