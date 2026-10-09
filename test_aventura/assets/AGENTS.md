# Purpose

This directory stores visual assets, tilesets, sprites, and catalog manifests dedicated exclusively to the adventure sandbox and studio editors.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Assets in this directory are hermetically scoped to `test_aventura/` and MUST NOT be moved to `public/` or `_raw-assets/`.

## Key Files

- [`tiles_registry.json`](./tiles_registry.json): Master canonical registry of tiles and coordinates.

## Work Guidance

- Organize tiles into subfolders by domain (tiles, sprites, prefabs, canon).

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [studio/AGENTS.md](./studio/AGENTS.md): Studio texture catalogs and regional tile assets.
