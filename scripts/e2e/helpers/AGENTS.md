# AGENTS.md - E2E Test Helpers

Helper utilities and background file writer queues for end-to-end browser simulations and test runners.

## Governance & Rules

- All file paths written or renamed by helper queues MUST be verified and sanitized against directory traversal (reject `..` and enforce relative path bounds).
- Zero fallback policy: explicit error reporting on missing locator elements or invalid simulation payload states.
- **Resilient Interaction Timeout Budgeting**: Helpers that interact with ephemeral DOM nodes (e.g. `clickResilient`) MUST enforce strict local UI settling budgets (`MAX_UI_SETTLE_TIMEOUT_MS = 2000ms`) and explicit timeout options in `locator.evaluate` calls to prevent unmounted elements from hanging until Playwright's global test timeout.
