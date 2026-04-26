---
name: vue-pinia-best-practices
description: "Pinia stores, state management patterns, store setup, and reactivity with stores."
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
---

# Vue Pinia Best Practices

Pinia best practices, common gotchas, and state management patterns.

## Store Setup

- Getting "getActivePinia was called" error at startup → See [pinia-no-active-pinia-error](references/pinia-no-active-pinia-error.md)
- Setup stores missing state in DevTools or SSR → See [pinia-setup-store-return-all-state](references/pinia-setup-store-return-all-state.md)

## Reactivity

- Store destructuring stops updating UI reactively → See [pinia-store-destructuring-breaks-reactivity](references/pinia-store-destructuring-breaks-reactivity.md)
- Store methods lose context in template calls → See [store-method-binding-parentheses](references/store-method-binding-parentheses.md)

## State Patterns

- Filters reset on refresh or can't be shared → See [state-url-for-ephemeral-filters](references/state-url-for-ephemeral-filters.md)
- Building production app without DevTools or conventions → See [state-use-pinia-for-large-apps](references/state-use-pinia-for-large-apps.md)
- **UI State Persistence**: For transient UI states that should survive session refreshes (e.g., active tabs, filters, sidebar expansion), use `localStorage` within the store's initialization or a watcher. This prevents annoying state resets when the user navigates or reopens a side panel.
- **Centralized Loading Stack**: For complex apps with concurrent async processes, use a **stack-based** loading store. Instead of a single `isLoading` boolean, push loading objects `{ id, message, isGlobal }` to an array. The UI should render the top-most item (or prioritize `isGlobal` overlays). This prevents concurrent tasks from "clobbering" each other's messages and ensures the loader only disappears when the stack is empty.
- **State Synchronization (Cross-Store)**: When a local store property must reflect and persist in a global state (e.g., `gameStore.state`), use a `computed` property with a getter and setter. This ensures 1:1 synchronization and avoids "ghost" local state that desyncs from the source of truth after persistence cycles.
- **Circular Dependency Resolution**: To break loops between stores (e.g., `ui` -> `game` -> `ui`), move shared state to an independent "leaf" store (e.g., `profileStore`) that doesn't import the other stores. If cross-imports are unavoidable, use `useOtherStore()` locally inside actions instead of at the top level.

## Timers & Side Effects

- **Guarded Intervals**: When using `setInterval` or timers within a store for reactive global cycles (e.g., game world time), always check for an existing active timer ID before starting a new one to prevent duplicates during HMR or re-initialization.

## API Stability & Store Proxies

- **MANDATORY**: When delegating core store logic to a specialized sub-store (e.g., moving modal logic to `modalStore`), you **MUST** maintain proxy methods in the primary store (e.g., `uiStore.open()`).
- **Why**: This maintains a stable API for components and prevents "breaking changes" across the codebase during architectural refactors.
- **Export Integrity (Refactor Safety)**: When moving, renaming, or deleting state variables/methods within a store, you **MUST** immediately synchronize the `return { ... }` object. Leaving orphaned references in the export block will cause a `ReferenceError` during application boot.
