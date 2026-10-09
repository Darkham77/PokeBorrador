# Purpose

This directory provides automated unit and algorithmic test suites covering the procedural map generator and studio mechanics.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Tests in this subtree verify algorithmic integrity across autotiling, road networks, and bridge placements.

## Key Files

(No top-level code files)

## Work Guidance

- Run tests using `npx vitest run test_aventura/tests/`.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [adventure/AGENTS.md](./adventure/AGENTS.md): Graph traversal and Dijkstra navigation algorithm tests.
- [map/AGENTS.md](./map/AGENTS.md): Procedural map generator, autotile matrix, and bridge integrity tests.
- [studio/AGENTS.md](./studio/AGENTS.md): Studio store and editor interaction tests.
