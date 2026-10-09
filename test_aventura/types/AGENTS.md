# Purpose

This directory provides TypeScript contracts, data models, and type definitions for map data, procedural biomes, and editor states.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Types in this subtree are scoped to `test_aventura` and decoupled from production schemas in `src/types/`.

## Key Files

(No top-level code files)

## Work Guidance

- Derive specific unions from canonical definitions where possible.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [map/AGENTS.md](./map/AGENTS.md): Continental, regional, and procedural map domain type contracts.
