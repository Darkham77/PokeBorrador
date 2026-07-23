# Purpose

Routing tables and route guards configuration.

## Ownership

Frontend Architecture Team.

## Local Contracts

- Ensure navigation guards do not deadlock loading gates.

## Work Guidance

- Keep lazy loading rules active for main views to optimize bundle sizes.
- **PWA Cache Reversion & Self-Healing**: Coordinate service worker updates deterministically (e.g. Workbox `clientsClaim: true`, `skipWaiting: false`). The final cache-busting reload must redirect to `window.location.origin + baseUrl + '?t=timestamp'` to ensure fresh assets.
- **Dynamic Import Failures**: Catch dynamic component import failures (like fetch fails or CSS preloads) in `app.config.errorHandler` and forward them to the error store.
- **Network & Chunk Error Routing**: When chunk loading or fetch errors are caught, the routing store must skip the generic crash overlay and emit a `PWA_NEED_REFRESH` signal on `gameBus` to display the manual update gate.

## Verification

- Run standard lint and types checks.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
