# Purpose

Extract reusable, reactive view logic, state interactions, and lifecycles out of Vue views.

## Ownership

Frontend Developers.

## Local Contracts

- **Composition API Standard**: All composables must adhere to standard Vue 3 Composition API rules, wrapping states in reactive hooks.
- **GSAP Orchestration Protocol**: Composables that execute visual transitions must use native GSAP orchestration features and deterministic triggers (`onComplete`, timeline sequencing) instead of numerical `setTimeout` delays.

## Work Guidance

- Ensure that any dynamic coordinate variables returned by positioning composables are exposed as unitless numbers (relying on CSS calc multiplication for unit conversions).
- Clean up window events, resize hooks, and observers inside composables using `onUnmounted` or correct lifecycle hooks to prevent memory leaks.
- **Prohibition on Immediate Watchers for Late-Initialized Functions**: It is strictly forbidden to use immediate watchers (`{ immediate: true }`) on state properties inside composables if the watcher callback invokes variables or helper functions (such as `resetAll`) defined lower in the setup scope, as this triggers runtime reference errors (`Cannot access before initialization`) during initial mount. Always place the watcher after the referenced functions are fully defined, or run the watcher without immediate option.

## Child DOX Index

- [adventure/](./adventure/AGENTS.md): Domain module documentation for adventure.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [effects/](./effects/AGENTS.md): Domain module documentation for effects.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [map/](./map/AGENTS.md): Domain module documentation for map.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [navigation/](./navigation/AGENTS.md): Domain module documentation for navigation.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [pvp/](./pvp/AGENTS.md): Domain module documentation for pvp.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [ui/](./ui/AGENTS.md): Domain module documentation for ui.
