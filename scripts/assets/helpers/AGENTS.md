# Purpose

Helper utilities for asset bounding box analysis, visual geometry computation, and automated asset catalog generation.

## Ownership

Asset Pipeline Engineers / Frontend Developers.

## Local Contracts

- Follow standard repository modularity guidelines (<500 LOC per file).
- Bounding box extraction algorithms must remain deterministic and cross-platform safe.
- **Shiny Asset Deduplication Protocol (`packFeetCoordinates`)**: When packing footprint databases (`pokemonFeetDatabase.json`), generator routines MUST compare shiny sprite coordinates against their base sprite counterpart. If coordinates are identical, the shiny entry MUST be omitted to minimize file size. If physical geometry differs, the unique shiny entry MUST be retained.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
