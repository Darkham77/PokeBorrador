# Purpose

Domain modal registries decomposing lazy-loaded component definitions by subdomain.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Define modal component bindings using `defineResilientAsyncComponent`.
- Enforce strict typing on registry maps.

## Key Files

- `battleModals.ts`: Battle and PvP modal component bindings.
- `pokemonModals.ts`: Pokémon management and daycare modal component bindings.
- `shopModals.ts`: Economy, marketplace, and shop modal component bindings.
- `systemModals.ts`: System settings, profile, and generic modal component bindings.

## Work Guidance

- Ensure lazy imports point to valid SFC components in `@/components/`.

## Verification

- `npm run auditor`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
