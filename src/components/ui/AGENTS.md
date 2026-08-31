# Purpose

Manage the logic and assets of ui.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **HUD Action Modals Idle & Hover Preloading (`ActionButtons.vue`)**: Primary HUD action controls (Profile, Settings, Library) must prefetch their lazy-loaded modal SFC chunks during browser idle time (`requestIdleCallback`) and on container/button hover (`@mouseenter`), ensuring instantaneous modal opening without on-demand compilation delays in development or network latency in production.
- **Criminality Bar HUD (`CriminalityBar.vue`)**: Visual gauge floating on map tab exclusively for Team Rocket members. Exposes explicit test IDs (`#criminality-bar`, `#criminality-bar-fill`, `#criminality-percent-label`), calculates excess levels via `calculatePoliceBonusLevel()`, enforces a visual height ceiling of 100%, and activates red pulse/glow upon reaching or exceeding 100% criminality.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [navigation/](./navigation/AGENTS.md): Modular HUD navigation groups and submenus.
