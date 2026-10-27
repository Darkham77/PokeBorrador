---
name: project-browser-testing
description: >-
  Interactive browser QA, DevTools debugging, and tester inventory population orchestrator on
  https://localhost:5173. Use whenever manually inspecting UI/UX in the browser, logging in as test
  user ASH, querying read-only state via window.__VITE_DEBUG__, or populating the player bag with
  test items via npm run test:populate-inventory. Delegates detailed protocols to
  @/project-standards/references/qa/browser_testing_manual.md. For automated Playwright E2E
  simulations on port 5174 and Showdown fuzzers, use /game-simulation instead.
---

# Skill: Interactive Browser QA & Tester Inventory (`localhost:5173`)

> [!IMPORTANT]
> To perform interactive browser QA, you **MUST** follow the login, navigation, and read-only diagnostics protocol detailed in the [Browser Testing Manual](../project-standards/references/qa/browser_testing_manual.md) and adhere to **`@/architecture`** (`/architecture`).
>
> For automated Playwright E2E simulation suites (`*.simulation.ts` on port `5174`) and Showdown fuzzer replays, always invoke [`/game-simulation`](../game-simulation/SKILL.md) instead.

## 1. Interactive Execution Flow

1. **Local Dev Server (`5173`)**: Ensure `https://localhost:5173` is active for manual browser inspection (port `5174` is reserved exclusively for automated Playwright E2E suites).
2. **Mandatory UI Login (`ASH`)**: Navigate to `/login`, enter `ASH`, and click Login through the official UI (never bypass login via `evaluate`, as UI login initializes `window.__VITE_DEBUG__`).
3. **Read-Only Diagnostics (`window.__VITE_DEBUG__`)**: Inspect store state and diagnostics without mutating gameplay flows; drive all navigation and interactions through visible official `#<id>` controls.

## 2. Populate Tester Inventory (`npm run test:populate-inventory`)

When preparing the test account (`ASH`) to test bag items, medicine, evolution stones, repels, or rare candies in the browser:

1. Generate the console injection snippet:

   ```bash
   npm run test:populate-inventory
   ```

2. Execute the generated snippet in the browser DevTools console on `https://localhost:5173` following the [Tester Inventory Population Protocol](../project-standards/references/qa/browser_testing_manual.md#9-tester-inventory-population-protocol-npm-run-testpopulate-inventory).

## 3. Final Integrity Verification (Delegated to `/architecture`)

After verifying behavior in the browser and making any source code changes in `src/`, follow the **Daily Verification Cadence** governed by **`/architecture` (Core Invariant #14)**:

- **Fast Iterative Inner Loop**: `npm run auditor:lint`
- **Work-Complete Outer Gate**: `npm run auditor` (plus `npm run test` when `src/` or `database/` logic was modified). Never run `npm run auditor:lint` redundantly after `npm run auditor`.

## 4. Diagnostics

If a visual flow or interaction fails, perform a dual diagnostic by reviewing both the browser DevTools console and the Vite development server logs simultaneously before proposing a fix via **`/systematic-debugging`** (RED-GREEN First).
