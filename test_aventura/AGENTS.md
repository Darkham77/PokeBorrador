# Purpose

Encapsulated prototyping sandbox, studio suite, and experimental environment for 2D adventure mechanics, procedural map engines, and tilemap editors.

## Ownership

Game Mechanics / World Exploration Prototyping.

## Local Contracts

- **Hermetic Sandbox Boundary**: Files in this directory (`views/`, `logic/`, `components/`, `stores/`, `types/`, `assets/`, `scripts/`, `tests/`) serve strictly as an experimental development sandbox and prototype testing suite. They are not bundled into the main game production build (`src/`).
- **Zero Production Intrusion**: Modules in `src/` MUST NOT import prototypes or assets directly from `test_aventura/`. Access is strictly restricted to developer tooling via the internal debug panel (`LocalDebugPanel.vue`).
- **Encapsulated Assets Namespace**: Tiles, sprites, and prefabs used by this suite reside exclusively in `test_aventura/assets/` to ensure zero contamination of `public/assets/` or `_raw-assets/`.
- **Documentation Preservation**: Design documents located here record exploratory architectural models for the Kanto/Johto world graph.

## Key Files

- [`App.vue`](./App.vue): Multitool Hub and top navigation bar for the 5 sandbox tools.
- [`main.ts`](./main.ts): Application bootstrap mounting Pinia and memory router.

## Work Guidance

- To test the visual suite, launch `npm run dev` and open `http://localhost:5173/test_aventura/index.html`.
- For unit testing, run `npx vitest run test_aventura/tests/`.

## Verification

- `npm run auditor:dox-integrity`
- `npm run auditor:lint`

## Child DOX Index

- [assets/AGENTS.md](./assets/AGENTS.md): Visual assets, tilesets, and studio textures catalog.
- [components/AGENTS.md](./components/AGENTS.md): Reusable UI components and studio canvas viewports.
- [composables/AGENTS.md](./composables/AGENTS.md): Composable helpers for texture atlas management.
- [config/AGENTS.md](./config/AGENTS.md): Map prop definitions, structural templates, and studio constants.
- [data/AGENTS.md](./data/AGENTS.md): Static datasets, manifests, and Johto map graph bundles.
- [logic/AGENTS.md](./logic/AGENTS.md): Mathematical, procedural, and pathfinding logic engines.
- [scripts/AGENTS.md](./scripts/AGENTS.md): CLI utilities for map rendering and asset extraction.
- [stores/AGENTS.md](./stores/AGENTS.md): Pinia state stores for map generation and camera viewports.
- [styles/AGENTS.md](./styles/AGENTS.md): Scoped CSS animation keyframes and styles.
- [tests/AGENTS.md](./tests/AGENTS.md): Algorithmic unit tests for autotiling and generation mechanics.
- [types/AGENTS.md](./types/AGENTS.md): TypeScript contracts and domain models for maps.
- [views/AGENTS.md](./views/AGENTS.md): Top-level views and editor pages for the 5 suite tools.
