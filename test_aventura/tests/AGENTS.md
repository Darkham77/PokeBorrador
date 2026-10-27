# Purpose

This directory provides automated unit and algorithmic test suites covering the procedural map generator and studio mechanics.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Tests in this subtree verify algorithmic integrity across autotiling, road networks, and bridge placements.
- **Sandbox URL Prefix**: Every runtime asset URL produced by this sandbox (`resolveTileUrl`, tiles registry `file_path`, procedural map `filePath`) starts with `/test_aventura/assets/`. Tests MUST assert that prefix, never `/assets/`.
- **City Isolation Mask**: In a vertically stacked building pair, the northern building always keeps `CITY_FRONT_CLEARANCE` (2 tiles) free to the south, regardless of placement order.
- **Registry Fetch Tests**: `PrefabsRegistryService.loadManifest` resolves URLs against `globalThis.location.origin`; Node tests MUST `vi.stubGlobal('location', ...)`.

## Key Files

(No top-level code files)

## Work Guidance

- Run tests using `npm run test:node -- test_aventura/tests/` (or `npm test -- test_aventura/tests/`).

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [adventure/AGENTS.md](./adventure/AGENTS.md): Graph traversal and Dijkstra navigation algorithm tests.
- [map/AGENTS.md](./map/AGENTS.md): Procedural map generator, autotile matrix, and bridge integrity tests.
- [studio/AGENTS.md](./studio/AGENTS.md): Studio store and editor interaction tests.
