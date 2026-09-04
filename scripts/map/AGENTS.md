# Purpose

Map generation scripts, tileset ingestion pipelines, terrain compilers, and graphical asset synchronizers for Poké Vicio.

## Ownership

Map Engine / World Pipeline Engineers.

## Local Contracts

- Strict compliance with Node.js 26+ native execution standards.
- All core tools MUST be registered in `package.json` (`npm run test:map`, `npm run export:map`, `npm run map:sync`, `npm run tiles:analyze`, `npm run studio`, etc.).
- Canonical stepped pyramid (*zigurat*) mountain layout for elevations and cliffs:
  1. Each floor must consist of a complete vertical cliff face (`cliff_face` 32px + `cliff_left` 16px + `cliff_right` 16px), followed by a walkable mountain dirt floor (`poke_mountain_dirt` / `poke_mountain_dirt_gray`), followed by the next cliff face.
  2. Floors must strictly decrease in surface area as elevation increases: \(A_{\text{floor}}(L+1) < A_{\text{floor}}(L)\), culminating in the mountain roof/summit.
  3. Mountain dirt floors at elevation $\ge 2$ strictly prohibit tree generation (`canPlant = false`).
  4. Rocky terrain decorations must be limited to canonical boulders (`rock_boulder`) and rubble (`rock_rubble`).
  5. Extracted sub-tiles from master sheets must strictly adhere to their bounding boxes with 0px neighbor bleed.
- O(1) tile lookup dictionaries using typed constants (`Record<MapTileId, TileMetadata>`).
- Zero tolerance for ad-hoc scratch scripts in production directory: all exploratory scripts must reside in `scratch/`.

## Work Guidance

- Use Sharp and HTML5 Canvas composite runners for high-resolution 4K map exports.
- Follow hybrid tile architecture: atomic 16x16 / 32x32 tiles for procedural autotiling terrain, coupled with canonical prefabs for buildings and landmarks.
- Coordinate with `public/assets/maps/kanto/` for baked chunks and tileset palettes.

## Verification

- Run `npm run test:map` to verify 100% integrity of autotiling rules, chunk budgets, and asset definitions.
- Verify zero warnings in `npm run lint`.

## Reference Manuals

- [scripts/AGENTS.md](../AGENTS.md): Automation, build processes, and utility scripts standards.
