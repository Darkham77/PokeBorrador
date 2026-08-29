# Purpose

Manage the logic and assets of unit.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Global Stub Lifecycle Cleanup**: Any test using `vi.stubGlobal()` (e.g. `Worker`, `localStorage`) MUST register `afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); })` to prevent cross-suite contamination.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Child DOX Index

- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [components/](./components/AGENTS.md): Domain module documentation for components.
- [data/](./data/AGENTS.md): Domain module documentation for data catalogs and O(1) dictionaries.
- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
- [encounters/](./encounters/AGENTS.md): Domain module documentation for encounters.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [stores/](./stores/AGENTS.md): Domain module documentation for Pinia stores.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [world/](./world/AGENTS.md): Domain module documentation for world.
