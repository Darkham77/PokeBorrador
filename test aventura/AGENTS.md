# test aventura

Standalone prototyping sandbox and experimental environment for 2D adventure mechanics, tilemaps, bicycle movement, and pathfinding algorithms.

## Ownership

Game Mechanics / World Exploration Prototyping.

## Local Contracts

- **Isolated Sandbox Boundary**: Files in this directory (`App.vue`, `main.ts`, `mapData.ts`, `kantoGraph.ts`, `adventurePathfinding.ts`) serve strictly as an experimental development sandbox and prototype testing ground. They are not bundled into the main game production build (`src/`).
- **Zero Production Intrusion**: Modules in `src/` MUST NOT import prototypes directly from `test aventura/`. Whenever a mechanic tested here is graduated to production, it must be cleanly refactored into `src/` following official project standards (`@/project-standards`, `@/domain-type-first`, and GSAP animations).
- **Documentation Preservation**: Design documents (`DESIGN_DOC.md`, `FARMING_ROUTES_DESIGN_DOC.md`, bicycle proposals) located here record early exploratory architectural models for the Kanto/Johto world graph.

## Verification

- Run `npm run audit:dox` to ensure this sandbox directory is indexed and conforming to DOX standards.
