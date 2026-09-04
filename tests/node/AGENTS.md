# Purpose

Manage the logic and assets of node.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Factory Resource Disposal Scoping**: When writing helper factory functions that instantiate disposable resources (such as `new DatabaseSync(':memory:')`), do NOT declare the instance with `using` inside the helper body. Return the raw instance so the calling test block retains ownership and disposes of it with `using db = createMigratedDatabase()`.
- **Deterministic & Self-Contained Tests**: Vitest tests under `tests/node/` must be 100% self-contained and deterministic with frozen in-memory fixtures. They must NEVER dynamically read or depend on transient/mutable CLI output files from `scripts/e2e/results/`.
- **Auditor Subprocess Scoping**: When executing CLI maintenance scripts (`audit_project.ts`, `audit_full.ts`, etc.) via `execSync` / `child_process` in tests, ALWAYS scope target paths using `--path=<dir>` (e.g. `--path=src/data/inventory`). Never execute un-scoped repository-wide audits inside test assertions.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Child DOX Index

- [admin/](./admin/AGENTS.md): Domain module documentation for admin.
- [adventure/](./adventure/AGENTS.md): Domain module documentation for adventure map logic tests.
- [assets/](./assets/AGENTS.md): Domain module documentation for assets.
- [auditors/](./auditors/AGENTS.md): Domain module documentation for auditors.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [box/](./box/AGENTS.md): Domain module documentation for box.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [evolution/](./evolution/AGENTS.md): Domain module documentation for evolution.
- [events/](./events/AGENTS.md): Domain module documentation for events.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [items/](./items/AGENTS.md): Domain module documentation for items.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [map/](./map/AGENTS.md): Node tests for map tile registries, autotiling, and world generation mechanics.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [trading/](./trading/AGENTS.md): Domain module documentation for trading.
- [validation/](./validation/AGENTS.md): Domain module documentation for validation.
- [world/](./world/AGENTS.md): Domain module documentation for world.
