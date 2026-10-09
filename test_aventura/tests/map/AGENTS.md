# Purpose

Node-level unit and integration tests for map tile registries, coordinate translations, autotiling, and world generation mechanics.

## Ownership

Testing / QA Engineers.

## Local Contracts

- Vitest tests must run cleanly under Node.js 26+ native runner (`npm run test:node`).
- Deterministic, self-contained assertions with zero external network or filesystem mutation side-effects.
- 100% type-safe imports with explicit `.ts` relative extensions.

### Reference Manuals

- [tests/node/AGENTS.md](../AGENTS.md): Node test execution and deterministic scoping rules.

## Work Guidance

- Test tile mapping validity, coordinate boundaries, elevation constants, and sprite registry lookups.
- Validate canonical building and prefab assets integrity, dimensions, and zero unkeyed chroma backgrounds (`buildingPrefabsIntegrity.test.ts`).
- Validate canonical 2D GBA bridge autotiling, corridor span detection, and water crossings (`canonicalBridgeEngine.test.ts`).
- Validate natural islet sculpting, zero ocean water blitting over land, and landing-to-doorway route connectivity for water landmarks (`waterLandmarkIsletBridge.test.ts`).
- Validate coastal sand autotiling and bridge shore landing outer corner integrity (`coastBridgeCornerIntegrity.test.ts`).
- Validate alpha transparency blending for paths on macro biomes and ground terrain under mountain outer corners (`macroBiomePathAndMountainCorners.test.ts`).
- Validate highland vegetation and decorative rock props consistency (`mintHighlandVegetationAndProps.test.ts`).

## Verification

- `npm run test:node -- tests/node/map/` must pass 100% with exit code 0.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
