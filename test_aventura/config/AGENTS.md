# Purpose

This directory provides configuration definitions, structural templates, prop registries, and constant thresholds for map generation and editor tooling.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Constants and configs here are isolated to the `test_aventura` suite.
- Structural templates define canonical footprints and tile collision metadata.

## Key Files

- [`mapProps.ts`](./mapProps.ts): Map decorative and interactive prop registry definitions.
- [`mapStructures.ts`](./mapStructures.ts): Canonical building structure templates and footprints.
- [`studioConstants.ts`](./studioConstants.ts): Studio configuration constants including history depth thresholds.

## Work Guidance

- Prefer descriptive named constants (`as const`) over literal magic values.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
