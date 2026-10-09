# Purpose

Manage reactive composables and studio lifecycle hooks for developer asset tooling and canvas interaction.

## Ownership

Frontend Engineers / Tooling Developers.

## Local Contracts

- `useAssetAtlas.ts`: Reactive state orchestrator managing zoom, pan, grid visibility, and sprite selection for the Asset Atlas Inspector.

## Key Files

- [`useAssetAtlas.ts`](./useAssetAtlas.ts): Module implementation.

## Work Guidance

- Ensure clean lifecycle cleanup on component unmount.
- Enforce strict typing without naked primitives.

## Verification

- `npm run lint`
- `npm run validate:types`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
