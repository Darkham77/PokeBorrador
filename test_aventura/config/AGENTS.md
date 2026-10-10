# Purpose

This directory provides configuration definitions, structural templates, prop registries, and constant thresholds for map generation and editor tooling.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Constants and configs here are isolated to the `test_aventura` suite.
- Structural templates define canonical footprints and tile collision metadata.

## Key Files

- [`archipelagoConfig.ts`](./archipelagoConfig.ts): Island and archipelago procedural generation thresholds.
- [`canvasRendererConfig.ts`](./canvasRendererConfig.ts): Canvas rendering visual offsets and tile scale factors.
- [`cityEngineConfig.ts`](./cityEngineConfig.ts): Urban grid layout and road rasterization thresholds.
- [`continentalEngineConfig.ts`](./continentalEngineConfig.ts): Continental macro-terrain synthesis parameters.
- [`continentalWorldConfig.ts`](./continentalWorldConfig.ts): World map boundaries and chunk spatial dimensions.
- [`continentGenConfig.ts`](./continentGenConfig.ts): Continent procedural elevation and biome parameters.
- [`continentMountainConfig.ts`](./continentMountainConfig.ts): Mountain ridge carving and cliff elevation parameters.
- [`continentPersistenceConfig.ts`](./continentPersistenceConfig.ts): Serialization and binary chunk compression settings.
- [`continentSculptingConfig.ts`](./continentSculptingConfig.ts): Terrain smoothing, slope filters, and landmass erosion rules.
- [`continentWorkerConfig.ts`](./continentWorkerConfig.ts): Web Worker thread execution and chunk message buffers.
- [`graphEmbeddingConfig.ts`](./graphEmbeddingConfig.ts): Planar topological graph layouts and routing node positions.
- [`kantoCarverConfig.ts`](./kantoCarverConfig.ts): Path carving and topological river corridor carving metrics.
- [`kantoRegionalConfig.ts`](./kantoRegionalConfig.ts): Regional biome matrices and canonical settlement anchors.
- [`kantoTileEngineConfig.ts`](./kantoTileEngineConfig.ts): Autotiling bitmask lookups and atlas texture offsets.
- [`mapProps.ts`](./mapProps.ts): Map decorative and interactive prop registry definitions.
- [`mapStructures.ts`](./mapStructures.ts): Canonical building structure templates and footprints.
- [`patchExtractorConfig.ts`](./patchExtractorConfig.ts): Sub-grid patch extraction and asset slicing bounds.
- [`poiPlacementConfig.ts`](./poiPlacementConfig.ts): Point of interest spatial distribution constraints.
- [`proceduralMapConfig.ts`](./proceduralMapConfig.ts): Map dimensions, seed ranges, and default camera positions.
- [`riverHydrographyConfig.ts`](./riverHydrographyConfig.ts): River flow simulation, branch probability, and estuary thresholds.
- [`spritePipelineConfig.ts`](./spritePipelineConfig.ts): Sprite slicing, alpha channel clipping, and frame dimensions.
- [`studioConstants.ts`](./studioConstants.ts): Studio configuration constants including history depth thresholds.
- [`tileProcessorConfig.ts`](./tileProcessorConfig.ts): In-browser tile rasterization batch sizes and canvas cache limits.
- [`wildernessConfig.ts`](./wildernessConfig.ts): Flora density, wild grass encounters, and natural obstacle frequency.

## Work Guidance

- Prefer descriptive named constants (`as const`) over literal magic values.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
