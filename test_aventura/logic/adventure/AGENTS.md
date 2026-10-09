# Purpose

This directory implements core graph-based pathfinding, route topology, and regional nodes representation for the Kanto adventure prototype.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Functions here must remain pure, deterministic, and side-effect free.
- Dijkstra pathfinding operates strictly over validated route edge matrices.

## Key Files

- [`adventurePathfinding.ts`](./adventurePathfinding.ts): Dijkstra algorithm implementation for multi-node navigation.
- [`kantoGraph.ts`](./kantoGraph.ts): Static graph topology, connections, and geographical node positions of Kanto.
- [`mapData.ts`](./mapData.ts): Route metadata, encounters hints, and checkpoint definitions.

## Work Guidance

- Ensure graph nodes use strongly-typed identifiers and avoid loose string lookups.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
