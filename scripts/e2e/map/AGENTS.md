# Purpose

Adventure World Map E2E Playwright simulations validating navigation, route path traversal, focal zooming, and modal interactions.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations run in local browser instances against the persistent Vite server.
- All map interactions must use official UI elements (`#map-viewport`, `#btn-zoom-in`, `#btn-zoom-out`, `#btn-adv-heal`, `.adv-node-card-inner`).
- Wheel zoom and pinch zoom must anchor scale changes smoothly to focal coordinates without leaking events to background views.

## Work Guidance

- Test multi-viewport behavior (Mobile viewport 390x844 vs PC Desktop 1280x720) to guarantee responsive rendering parity and zero card leaks.
- Validate travel planning, forecast stats display, Pokémon Center healing, and arrival state transitions.

## Verification

- Run `npx playwright test scripts/e2e/map/adventure_map.simulation.ts` to execute adventure map simulations.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
