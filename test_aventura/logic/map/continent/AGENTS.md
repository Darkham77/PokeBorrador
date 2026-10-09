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

- `continentalEngine.ts`: Core orchestrator for continental terrain synthesis, biome masks, urban clearances, and the master `generatePokemonContinentalWorld` pipeline.
- `parametricContinentGenerator.ts`: Parametric continent generator computing Simplex elevation/moisture grids, biome distribution, urban node placement, and Kruskal MST roads.
- `routeGatePlacementEngine.ts`: Procedural route gatehouse checkpoint locator, clearance validator, and corridor splicing engine for regional highways.
- `autotileEngine.ts`: Bitmask calculation and tile selection for contiguous terrain boundaries.
- `continentPersistence.ts`: Browser storage serialization, migration, and export logic for continental projects.
- `spritePipelineEngine.ts`: Connected component analysis and asset processing pipeline for raw map imports.
- `svgRouteAdapter.ts`: Adapter translating SVG route path definitions into rasterized map grids and exporting full semantic Pokémon topology SVGs via `exportPokemonTopologyToSvg`.
- [`canonicalRegionPresets.ts`](./canonicalRegionPresets.ts): Module implementation.
- [`coastalFractalEngine.ts`](./coastalFractalEngine.ts): Module implementation.
- [`regionalPersistenceHelper.ts`](./regionalPersistenceHelper.ts): Module implementation.
- [`riverHydrographyEngine.ts`](./riverHydrographyEngine.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
