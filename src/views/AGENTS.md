# Purpose

Orchestrate top-level pages, routes, layouts, and view transitions.

## Ownership

Core Frontend.

## Local Contracts

- Route visibility guards and session state handling.
- Screen layouts must use `dvh` units to avoid mobile browser address bar clipping.

## Work Guidance

- Keep page views clean. Extract complex visual state management to composables.
- Standardize the loading screen gate; hide the loading veil entirely via `v-if` when `onMounted` triggers to prevent DOM blockages.
- Do not apply CSS `zoom` transforms to canvas wrappers (like Phaser `.battle-arena`); apply zooms strictly to surrounding UI panels.

## Verification

- Run `npm run lint` and verify routing flows in browser or E2E tests.

## Child DOX Index

This directory contains the primary views for routing and layouts:

- [AdventureTestView.vue](./AdventureTestView.vue): Overworld grid rendering and tile-based movement view.
- [BagView.vue](./BagView.vue): Inventory and items view.
- [GameView.vue](./GameView.vue): General view wrapper.
- [GymsView.vue](./GymsView.vue): Badge display and gym leaders/rematches view.
- [LoginView.vue](./LoginView.vue): User login and signup interface.
- [MainGameView.vue](./MainGameView.vue): Combined dashboard, stats, and navigation layout.
- [MapView.vue](./MapView.vue): World map view.
- [PokedexView.vue](./PokedexView.vue): Pokemon catalog and details view.
- [SocialView.vue](./SocialView.vue): Chat logs, active players list, and private messaging view.
