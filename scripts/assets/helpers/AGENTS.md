# Purpose

Helper utilities for asset bounding box analysis, visual geometry computation, and automated asset catalog generation.

## Ownership

Asset Pipeline Engineers / Frontend Developers.

## Local Contracts

- Follow standard repository modularity guidelines (<500 LOC per file).
- Bounding box extraction algorithms must remain deterministic and cross-platform safe.
- **Shiny Asset Deduplication Protocol (`packFeetCoordinates`)**: When packing footprint databases (`pokemonFeetDatabase.json`), generator routines MUST compare shiny sprite coordinates against their base sprite counterpart. If coordinates are identical, the shiny entry MUST be omitted to minimize file size. If physical geometry differs, the unique shiny entry MUST be retained.
- **Manual Shadow & Feet Overrides Ingestion Protocol**: Catalog generators (`packFeetCoordinates`, `generateAnimatedSpriteDatabase`) MUST read manual overrides from `src/data/pokemon/spriteShadowOverrides.json`. When a sprite entry exists in the overrides file, its explicit normalized coordinates (`feetX`, `feetY`) and `isFlying` status MUST take precedence over the automatic buffer analysis algorithm.
- **Compact Extended Feet Tuple Contract**: In `pokemonFeetDatabase.json`, sprite coordinates default to `[feetY, feetX]`. When `isFlying: true` is set, a 3rd element `1` is appended: `[feetY, feetX, 1]`. When `isFlying` is false or unset, the 3rd element MUST be omitted to prevent payload inflation. The runtime getter `requireFeetPoints` returns `{ feetY, feetX, isFlying?: boolean }`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
