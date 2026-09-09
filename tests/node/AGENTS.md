# Purpose

Manage the logic and assets of node.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Node.js Scope Restriction**: Only tests that execute in a real Node.js environment belong in `tests/node/`. Tests that mount Vue components, render templates, or require DOM/browser globals belong strictly in `tests/unit/` or `tests/integration/`.
- **Consolidation over Fragmentation**: Group deterministic reproduction cases and fixture replays into consolidated test suites (e.g. `fuzzer_reproduced_cases.test.ts`) instead of creating individual micro-files per fixture.
- **Factory Resource Disposal Scoping**: When writing helper factory functions that instantiate disposable resources (such as `new DatabaseSync(':memory:')`), do NOT declare the instance with `using` inside the helper body. Return the raw instance so the calling test block retains ownership and disposes of it with `using db = createMigratedDatabase()`.
- **Deterministic & Self-Contained Tests**: Vitest tests under `tests/node/` must be 100% self-contained and deterministic with frozen in-memory fixtures. They must NEVER dynamically read or depend on transient/mutable CLI output files from `scripts/e2e/results/`.
- **Auditor Subprocess Scoping**: When executing CLI maintenance scripts (`audit_project.ts`, `audit_full.ts`, etc.) via `execSync` / `child_process` in tests, ALWAYS scope target paths using `--path=<dir>` (e.g. `--path=src/data/inventory`). Never execute un-scoped repository-wide audits inside test assertions.
- **Container Reuse Concurrency Resilience Contract**: Micro-benchmark assertions validating Docker test container reuse MUST distinguish between warm container reuse and full cold-start SQL migration replays (~15,000ms). To eliminate false-positive timing flakiness under high Vitest worker concurrency (550+ test files), reuse threshold assertions MUST allow a resilient ceiling (e.g. `< 2500ms`) rather than ultra-tight micro-benchmarks (< 1000ms), absorbing CPU scheduling latency while strictly preventing container restarts.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Child DOX Index

- [admin/](./admin/AGENTS.md): Domain module documentation for admin.
- [assets/](./assets/AGENTS.md): Domain module documentation for assets.
- [auditors/](./auditors/AGENTS.md): Domain module documentation for auditors.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [box/](./box/AGENTS.md): Domain module documentation for box.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [e2e/](./e2e/AGENTS.md): Domain module documentation for e2e.
- [evolution/](./evolution/AGENTS.md): Domain module documentation for evolution.
- [events/](./events/AGENTS.md): Domain module documentation for events.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [items/](./items/AGENTS.md): Domain module documentation for items.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [pvp/](./pvp/AGENTS.md): Node.js unit tests for PvP persistence and team actions.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [trading/](./trading/AGENTS.md): Domain module documentation for trading.
- [ui/](./ui/AGENTS.md): Node.js unit tests for headless UI state logic and composables.
- [utils/](./utils/AGENTS.md): Domain module documentation for utils.
- [validation/](./validation/AGENTS.md): Domain module documentation for validation.
- [world/](./world/AGENTS.md): Domain module documentation for world.
