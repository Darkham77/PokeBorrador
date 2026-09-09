# Purpose

Manage the logic and assets of unit.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- **Default Node Environment & Explicit JSDOM Directive**: `tests/unit/` runs with `environment: 'node'` by default to eliminate JSDOM CPU overhead for pure math and logic tests. Any file that mounts Vue components (`mount`, `shallowMount`), tests Vue templates, or accesses `window`, `document`, or browser APIs MUST explicitly declare `// @vitest-environment jsdom` at line 1.
- **Prohibition on Heavy Node CLI & DB Migrations**: `tests/unit/` is strictly for frontend unit testing. Tests parsing full production backup JSON files, executing 84 database migrations, or running Node CLI scripts belong strictly in `tests/node/system/`.
- **Global Stub Lifecycle Cleanup**: Any test using `vi.stubGlobal()` (e.g. `Worker`, `localStorage`) MUST register `afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); })` to prevent cross-suite contamination.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [components/](./components/AGENTS.md): Domain module documentation for components.
- [composables/](./composables/AGENTS.md): Domain module documentation for composables.
- [data/](./data/AGENTS.md): Domain module documentation for data catalogs and O(1) dictionaries.
- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
- [encounters/](./encounters/AGENTS.md): Domain module documentation for encounters.
- [events/](./events/AGENTS.md): Domain module documentation for events.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [pvp/](./pvp/AGENTS.md): Domain module documentation for pvp.
- [services/](./services/AGENTS.md): Domain module documentation for services.
- [stores/](./stores/AGENTS.md): Domain module documentation for Pinia stores.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [views/](./views/AGENTS.md): Domain module documentation for views.
- [world/](./world/AGENTS.md): Domain module documentation for world.
