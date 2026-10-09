# Purpose

Stores canonical regional node graphs, coordinates, point-of-interest metadata, and route connectivity matrices for regional overworlds (e.g. Johto, Kanto).

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Architectural Mandates & Guidelines

- **Pure Declarations**: These datasets contain strictly frozen coordinate geometry and connection graphs; no business logic, reactive stores, or pathfinding algorithms belong here.
- **English ID Compliance**: All node and route keys must use canonical lowercase alphanumeric identifiers (
ewbark,
oute29, goldenrod).
- **O(1) Data Structures**: Graph lookup tables must be exposed as typed key-value maps (Record<string, AdventureProjectNode>) to support constant time indexing.
- **Dual Prefabs Manifest Parity Mandate**: Whenever a canonical building prefab or structure is re-extracted, cropped, or resized to match authentic GBA geometry, both `src/data/map/canonical_assets_manifest.json` and `public/assets/essentials/manifest.json` MUST be updated synchronously with matching pixel dimensions (`width`, `height`), tile bounds (`w`, `h`), and centered door offsets (`dx`, `dy`).

## Key Files

- johtoAdventureMapData.ts: Canonical node topology and route connections for the Johto regional map.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
