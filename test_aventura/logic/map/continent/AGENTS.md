# Purpose

Orchestrates large-scale continental terrain generation, connecting regional settlement graphs, carving biomes and highways, translating SVG route layouts, and serializing continental studio projects.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Architectural Mandates & Guidelines

- **Decoupled Architecture**: Logic in this directory must remain isolated from direct Vue reactivity; communicate via pure functions and domain data contracts.
- **RMXP Autotiling Parity**: Terrain calculations and bitmask evaluations must conform to 48-subtile autotile specifications (`autotileEngine.ts`).
- **Vector-to-Grid Fidelity**: Path adapters (`svgRouteAdapter.ts`) must translate continuous Bezier/polyline paths into rasterized grid footprints with appropriate clearance invariants.
- **Strict Storage Versioning**: Continental project persistence (`continentPersistence.ts`) must enforce versioned schema validation (`pokevicio_continent_projects_v2`) to prevent corrupt states.

## Key Files

- `continentalEngine.ts`: Core orchestrator for continental terrain synthesis, flood-filled border `oceanMask` isolation (excluding inland freshwater lakes from `filteredMaritimeRocks`), biome masks, urban clearances, and the master `generatePokemonContinentalWorld` pipeline.
- [`continentalCorridorCarver.ts`](./continentalCorridorCarver.ts): Terrain-aware route, path, bridge, and harbor pier carving sub-engine for parametric continents.
- [`continentalSettlementCompiler.ts`](./continentalSettlementCompiler.ts): Procedural POI, urban settlement layout compilation, and route gate placement sub-engine for parametric continents.
- [`continentTopologyValidator.ts`](./continentTopologyValidator.ts): Pure post-generation topology, maritime sealing, gate doorway alignment, and autotile defect validator.
- `parametricContinentGenerator.ts`: Parametric continent generator computing Simplex elevation/moisture grids, biome distribution, urban node placement, and Kruskal MST roads.
- `routeGatePlacementEngine.ts`: Procedural route gatehouse checkpoint locator, clearance validator, and corridor splicing engine for regional highways.
- `autotileEngine.ts`: Bitmask calculation and tile selection for contiguous terrain boundaries.
- `continentPersistence.ts`: Browser storage serialization, migration, and export logic for continental projects.
- `spritePipelineEngine.ts`: Connected component analysis and asset processing pipeline for raw map imports.
- `svgRouteAdapter.ts`: Adapter translating SVG route path definitions into rasterized map grids and exporting full semantic Pokémon topology SVGs via `exportPokemonTopologyToSvg`.
- [`canonicalRegionPresets.ts`](./canonicalRegionPresets.ts): Authentic regional geography presets for Kanto and Johto overworlds using organic coastlines, dry-land Mt. Silver clamping with dynamic south stair lookup, shared `sealCoastalSeaWithMaritimeRocks` / `applyDeepWaterCellsToContinent` maritime depth/barrier passes, urban hygiene passes (`sanitizeContinentalUrbanFences`, `anchorUrbanPropsToStreetsAndYards`), and full route/POI generation.
- [`coastalFractalEngine.ts`](./coastalFractalEngine.ts): Module implementation.
- [`continentHistoryDelta.ts`](./continentHistoryDelta.ts): Pure row Copy-on-Write Undo/Redo `DirtyRectHistoryDelta` builder/applier and bounded defect inspector synchronization helpers.
- [`corridorSignatureFeatures.ts`](./corridorSignatureFeatures.ts): Active `RouteDesignSignature` terrain feature stamper carving organic `2x2`/`3x2` shallow rain puddles flanking `wetland_puddle_marsh` and `highland_river_gorge` corridors safely clear of paths, bridges, cliffs, and settlements.
- [`regionalPersistenceHelper.ts`](./regionalPersistenceHelper.ts): Module implementation.
- [`regionalScaleProfile.ts`](./regionalScaleProfile.ts): Dimension-aware regional scale profiles (`128`, `256`, `400`) governing graph complexity, clearances, and route gate spacing.
- [`riverHydrographyEngine.ts`](./riverHydrographyEngine.ts): Downhill gradient river drainage with regional turn inertia and orthogonal staircase jag smoothing (`smoothRiverOrthogonalJags`).

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
