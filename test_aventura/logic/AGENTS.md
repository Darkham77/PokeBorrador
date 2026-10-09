# Purpose

This directory coordinates the algorithmic, procedural, and mathematical logic engines powering the adventure prototypes and map generators.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Logic algorithms in this subtree must remain decoupled from reactive store mutation logic.
- Procedural generation algorithms must be fully deterministic given an integer seed.

## Key Files

(No top-level code files)

## Work Guidance

- Keep graph and travel logic under `adventure/` and procedural terrain generation under `map/`.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [adventure/AGENTS.md](./adventure/AGENTS.md): Graph routing and Dijkstra pathfinding engines.
- [map/AGENTS.md](./map/AGENTS.md): Procedural map generators, autotiling matrices, and settlement placement engines.
