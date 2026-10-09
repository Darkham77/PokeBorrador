# Purpose

This directory provides static tile metadata catalogs and descriptor records for the Kanto studio editor.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Data files here describe static tile assets and mappings consumed by map canvas renderers.

## Key Files

- [`tile_catalog.js`](./tile_catalog.js): Precompiled JavaScript tile catalog dictionary.
- [`tile_catalog.json`](./tile_catalog.json): Structured JSON dataset of tile coordinates and IDs.

## Work Guidance

- Keep catalog entries aligned with actual image filenames in the textures directory.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
