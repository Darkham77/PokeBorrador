# Purpose

Helper utilities and background file writer queues for end-to-end browser simulations and test runners.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Governance & Rules

- All file paths written or renamed by helper queues MUST be verified and sanitized against directory traversal (reject `..` and enforce relative path bounds).
- Zero fallback policy: explicit error reporting on missing locator elements or invalid simulation payload states.
- **Resilient Interaction Timeout Budgeting**: Helpers that interact with ephemeral DOM nodes (e.g. `clickResilient`) MUST enforce strict local UI settling budgets (`MAX_UI_SETTLE_TIMEOUT_MS = 2000ms`) and explicit timeout options in `locator.evaluate` calls to prevent unmounted elements from hanging until Playwright's global test timeout.

## Key Files

- `batchSimulationHarness.ts`: Module implementation.
- `battleActionExecutionHelper.ts`: In-combat battle action execution helpers (moves, items, ball throws, switches) for E2E simulations.
- `battleEventHelpers.ts`: Module implementation.
- `battleReplayExecutionHelper.ts`: Execution orchestrator for replaying recorded Showdown battle steps.
- `battleScenarioSetupHelper.ts`: Scenario environment setup, team generation, and 7-pillar reset helpers for battle simulations.
- `certifiedCaseLoader.ts`: Module implementation.
- `e2eAutoBattleHelper.ts`: Automated battle driver and resilient combat decision helpers for E2E scenarios.
- `e2eCheckpointManager.ts`: Module implementation.
- `e2eLogger.ts`: Module implementation.
- `e2eMinigameHelper.ts`: Natural driver helpers for archaeology and fishing minigames.
- `e2eSessionHelper.ts`: Browser session bootstrap, page navigation, console interceptor, and login helpers.
- `fileWriterQueue.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
