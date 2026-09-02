# Purpose

Orchestrate top-level pages, routes, layouts, and view transitions.

## Ownership

Core Frontend.

## Local Contracts

- Route visibility guards and session state handling.
- Screen layouts must use `dvh` units to avoid mobile browser address bar clipping.
- **Window Capture Event Interception Contract**: Global event listeners attached to `window` with `{ capture: true }` (such as background scroll lockers in `App.vue`) MUST verify that a blocking modal is actually active (`uiStore.isAnyBlockingModalOpen`) before calling `stopPropagation()` or `preventDefault()`. Calling `stopPropagation()` unconditionally during the window capture phase destroys the event at the root and prevents it from ever reaching child viewports or map controls.

## Work Guidance

- Keep page views clean. Extract complex visual state management to composables.
- Standardize the loading screen gate; hide the loading veil entirely via `v-if` when `onMounted` triggers to prevent DOM blockages.
- Do not apply CSS `zoom` transforms to canvas wrappers (like Phaser `.battle-arena`); apply zooms strictly to surrounding UI panels.
- **Just-in-Time Web Worker Preloading**: Do not launch heavy simulation Web Workers (such as the Showdown Worker) during root application boot in `main.ts`. Preload them in `MainGameView.vue` `onMounted()` when entering the active game view.
- **Asynchronous View & Debug Panel Splitting**: Top-level views (`MainGameView`) and developer debug panels (`LocalDebugPanel`) must be loaded asynchronously via `defineAsyncComponent` to isolate their dependencies from the initial login chunk.

## Verification

- Run `npm run audit:warnings-diff` and verify routing flows in browser or E2E tests.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [game/](./game/AGENTS.md): Domain module documentation for game.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [social/](./social/AGENTS.md): Domain module documentation for social.
