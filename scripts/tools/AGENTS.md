# Purpose

Domain boundary and module implementation for tools. Defines architectural responsibilities and subsystem logic.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Overview

This directory contains utility CLI scripts and tools for developer workflow maintenance and data generation.

### Governance & Standards

- All scripts must follow TypeScript strict mode and Node 26+ native module resolutions.
- No loose fallbacks or silent error swallows allowed.

## Key Files

- `compare_combat.ts`: Module implementation.
- `compare_db_showdown.ts`: Module implementation.
- `fetch_ev_yields.ts`: Module implementation.
- `fix_showdown_descriptions.ts`: Module implementation.
- `normalize_random_sets.ts`: Module implementation.
- `tag_canon_items.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
