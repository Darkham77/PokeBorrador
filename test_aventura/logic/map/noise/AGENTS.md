# Purpose

Provides high-performance, deterministic Simplex Noise and Fractional Brownian Motion (FBM) algorithms for procedural map elevation, moisture, and terrain carving.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Architectural Mandates & Guidelines

- **Zero-Dependency Native Implementation**: Pure TypeScript implementation using integer bitwise operations and typed arrays for maximum performance.
- **Deterministic Seeding**: PRNG permutations must be strictly deterministic across platforms and test runs given the same numeric seed (e.g., using Mulberry32).
- **Constant Time Evaluation**: Coordinate sampling must maintain (1)$ complexity without dynamic allocations in execution loops.

## Key Files

- simplexNoise.ts: 2D Simplex noise generator with octave-based Fractional Brownian Motion (FBM) and seedable permutation tables.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
