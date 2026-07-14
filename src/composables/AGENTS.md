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

- [adventure/](./adventure/AGENTS.md): World movement, simulations, camera coordinates tracking, and layout scales.
- [battle/](./battle/AGENTS.md): Visual sequences, Phaser canvases coordinate managers, combat cameras, and active status tracking hooks.
- [effects/](./effects/AGENTS.md): Particle engines and weather visuals multipliers.
- [map/](./map/AGENTS.md): Map card animations and sprite observers.
- [modals/](./modals/AGENTS.md): Interactive modal triggers and queue handlers.
- [inventory/](./inventory/AGENTS.md): Shop layout, filtering, and animation composables.
- [pokemon/](./pokemon/AGENTS.md): Pokedex search filters and details view logic.
- [pvp/](./pvp/AGENTS.md): Ranked queue checkers and queue animations triggers.
- [system/](./system/AGENTS.md): Native back navigation helpers and PWA service updates.
- [ui/](./ui/AGENTS.md): Application responsive panels, layouts, inputs animations, and dynamic tooltips positioning.
