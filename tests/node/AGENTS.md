# Purpose

Manage the logic and assets of node.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Deterministic & Self-Contained Tests**: Vitest tests under `tests/node/` must be 100% self-contained and deterministic with frozen in-memory fixtures. They must NEVER dynamically read or depend on transient/mutable CLI output files from `scripts/e2e/results/`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Child DOX Index

- [admin/](./admin/AGENTS.md): Domain module documentation for admin.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [evolution/](./evolution/AGENTS.md): Domain module documentation for evolution.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [world/](./world/AGENTS.md): Domain module documentation for world.
