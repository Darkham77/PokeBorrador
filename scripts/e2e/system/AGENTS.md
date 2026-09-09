# Purpose

E2E browser simulations validating system-level update lifecycles, version compatibility gates, Service Worker triggers, and clean navigation/logout flows.

## Ownership

QA / Automation Engineers / Core Engine Developers.

## Local Contracts

- **100% ID-Based Locators**: Simulations locate interactive controls exclusively through `#id` selectors (`#app-loading-overlay-update-btn`, `#version-lock-logout-btn`, `#version-lock-retry-btn`, `#login-pwa-update-btn`).
- **Zero Artificial Timers**: Never use `page.waitForTimeout` or arbitrary sleeps; use `waitForURL`, event listeners, or explicit locator state waits.
- **Fail-Fast 10s Per-Action Limit**: Every UI transition or state assertion MUST complete within `MAX_PER_ACTION_TIMEOUT_MS` (10,000ms).
- **Dual-Engine Compatibility**: Scenarios must pass seamlessly across both SQLite and PostgreSQL drivers.
- **Save Shield Enforcement During Updates**: Verifies that triggering updates aborts game saves (`preventSave: true`) and closes sessions cleanly to prevent database corruption.

## Work Guidance

- Use `UpdateLifecycleSimulation` subclassing `BaseE2ESimulation`.
- Inject version discrepancy states via `useUpdateStore` methods (`notifyOutdatedClient`, `notifyDbIncompatible`, `notifyOutdatedServer`, `notifyChunkLoadError`).
- Confirm that clicking update/logout controls cleanly unsets the active session, sets `sessionStorage.block_autologin = 'true'`, and navigates directly to a URL ending in `/login`.

## Verification

- Run `npm run sim:e2e:system` to verify update flows.
- Run `npm run audit` to ensure 0 lint and structural errors.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
