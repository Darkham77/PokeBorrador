# Purpose

Mathematical engines and interaction utilities for the UI-Demo technical showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `pixelEngine.ts` implements the authoritative Bresenham quadrant circle rasterization algorithm for pixelated frame clip-paths.
- Supports dynamic scaling at 2px, 3px, and 4px grid resolutions.

## Key Files

- `useLiveInspector.ts`: Module implementation.
- [`pixelEngine.ts`](./pixelEngine.ts): Module implementation.

## Work Guidance

- Must not depend on UI frameworks; pure TypeScript mathematical geometry.

## Verification

- `npm run lint`
- `npm run audit`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
