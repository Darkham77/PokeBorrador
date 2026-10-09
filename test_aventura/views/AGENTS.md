# Purpose

This directory houses the top-level route views for in-browser creative studio tooling.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Directory Scope & Responsibilities

- **`MapStudioView.vue`**: Master page layout for `/studio/map`. Dynamically orchestrates the Macro Regional World Editor (`StudioToolbar`, `StudioAdventureGraphViewport`, `StudioAdventureGraphInspector`) and the Micro Local Cell/Tile Editor (`StudioToolbar`, `StudioLayersPanel`, `StudioTileCatalogDrawer`, `StudioCanvasViewport`, `StudioInspector`).

### Key Architectural Rules

1. **Decoupled View Orchestration**: The view switches layout reactively based on `adventureGraphStore.activeMode`. In regional modes ('graph', 'terrain', 'structures'), it renders the macro regional graph; in 'tile' mode, it renders the 3-panel micro cell editor (left: layers + catalog, center: canvas, right: inspector).
2. **Deterministic Control IDs**: All form inputs, modal dialog controls, navigation buttons, and export triggers must specify unique `id` attributes.
3. **Seamless State Roundtrip**: Changes in local cell editing mode are saved back into the active node of `useMapAdventureStudioStore` upon clicking return, ensuring 0 state desynchronization.
4. **Graceful Asset Ingestion**: Preloads tile catalog registry from static public assets upon mount, falling back to procedural generation gracefully.

## Key Files

- [`AssetAtlasInspectorView.vue`](./AssetAtlasInspectorView.vue): Module implementation.
- [`AutotileStudioView.vue`](./AutotileStudioView.vue): Module implementation.
- [`KantoAdventureView.vue`](./KantoAdventureView.vue): Module implementation.
- [`MapStudioView.vue`](./MapStudioView.vue): Module implementation.
- [`RegionalContinentStudioView.vue`](./RegionalContinentStudioView.vue): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
