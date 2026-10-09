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

### Reference Manuals

- [scripts/AGENTS.md](../AGENTS.md): Automation, build processes, and utility scripts standards.
- **Map Tile Catalog Governance**: Strict pre-cropped tile consumption and zero on-the-fly slicing rules.

## Key Files

- [`audit_all_settlements.ts`](./audit_all_settlements.ts): Module implementation.
- [`audit_all_tiles_sources.ts`](./audit_all_tiles_sources.ts): Module implementation.
- [`auto_tile_analyzer.mjs`](./auto_tile_analyzer.mjs): Module implementation.
- [`build_mobile_gallery_artifact.ts`](./build_mobile_gallery_artifact.ts): Module implementation.
- [`clean_rock_assets.ts`](./clean_rock_assets.ts): Module implementation.
- [`clean_tree_assets.ts`](./clean_tree_assets.ts): Module implementation.
- [`compile_region_map.mjs`](./compile_region_map.mjs): Module implementation.
- [`create_bridge_annotated_grid.mjs`](./create_bridge_annotated_grid.mjs): Module implementation.
- [`download_open_tilesets.mjs`](./download_open_tilesets.mjs): Module implementation.
- [`export_full_map.mjs`](./export_full_map.mjs): Module implementation.
- [`extract_all_canonical_bridge_tiles.mjs`](./extract_all_canonical_bridge_tiles.mjs): Module implementation.
- [`extract_canonical_bridge_tiles.mjs`](./extract_canonical_bridge_tiles.mjs): Module implementation.
- [`extract_silence_bridge_tiles.ts`](./extract_silence_bridge_tiles.ts): Module implementation.
- [`extract_tileset_hybrid.mjs`](./extract_tileset_hybrid.mjs): Module implementation.
- [`generate_audit_crops.ts`](./generate_audit_crops.ts): Module implementation.
- [`generate_bridge_showcase.ts`](./generate_bridge_showcase.ts): Module implementation.
- [`generate_continent_preview.ts`](./generate_continent_preview.ts): Module implementation.
- [`generate_croquis_barreras.mjs`](./generate_croquis_barreras.mjs): Module implementation.
- [`generate_dungeon_and_port_previews.ts`](./generate_dungeon_and_port_previews.ts): Module implementation.
- [`generate_firered_cliffs.mjs`](./generate_firered_cliffs.mjs): Module implementation.
- [`generate_fixed_crops.ts`](./generate_fixed_crops.ts): Module implementation.
- [`generate_gatehouse_previews.ts`](./generate_gatehouse_previews.ts): Module implementation.
- [`generate_golden_bridge_tiles.ts`](./generate_golden_bridge_tiles.ts): Module implementation.
- [`generate_metropolis_variants.ts`](./generate_metropolis_variants.ts): Module implementation.
- [`generate_multi_map_audit.ts`](./generate_multi_map_audit.ts): Module implementation.
- [`generate_pokemon_region_preview.ts`](./generate_pokemon_region_preview.ts): Module implementation.
- [`generate_ports_4_facings_showcase.ts`](./generate_ports_4_facings_showcase.ts): Module implementation.
- [`generate_ports_redesign_preview.ts`](./generate_ports_redesign_preview.ts): Module implementation.
- [`generate_procedural_variety_comparison.ts`](./generate_procedural_variety_comparison.ts): Module implementation.
- [`generate_region_preview.ts`](./generate_region_preview.ts): Module implementation.
- [`generate_sample_map.ts`](./generate_sample_map.ts): Module implementation.
- [`generate_single_continent_hd.ts`](./generate_single_continent_hd.ts): Module implementation.
- [`generate_verification_crops.ts`](./generate_verification_crops.ts): Module implementation.
- [`generate_vermilion_port_showcase.ts`](./generate_vermilion_port_showcase.ts): Module implementation.
- [`generate_water_preview.ts`](./generate_water_preview.ts): Module implementation.
- [`list_pois_and_crop.ts`](./list_pois_and_crop.ts): Module implementation.
- [`map_rules_engine.mjs`](./map_rules_engine.mjs): Module implementation.
- [`render_10_cities_showcase.ts`](./render_10_cities_showcase.ts): Module implementation.
- [`render_10_mountain_examples.ts`](./render_10_mountain_examples.ts): Module implementation.
- [`render_procedural_mountain_showcase.ts`](./render_procedural_mountain_showcase.ts): Module implementation.
- [`render_regional_preview.ts`](./render_regional_preview.ts): Module implementation.
- [`serve_mobile_gallery.ts`](./serve_mobile_gallery.ts): Module implementation.
- [`serve_studio.mjs`](./serve_studio.mjs): Module implementation.
- [`sync_assets_pipeline.mjs`](./sync_assets_pipeline.mjs): Module implementation.
- [`tile_registry.ts`](./tile_registry.ts): Module implementation.

## Work Guidance

- Use Sharp and HTML5 Canvas composite runners for high-resolution 4K map exports.
- Follow hybrid tile architecture: atomic 16x16 / 32x32 tiles for procedural autotiling terrain, coupled with canonical prefabs for buildings and landmarks.
- Coordinate with `public/assets/maps/kanto/` for baked chunks and tileset palettes.

## Verification

- Run `npm run test:map` to verify 100% integrity of autotiling rules, chunk budgets, and asset definitions.
- Verify zero warnings in `npm run lint`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
