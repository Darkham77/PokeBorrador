# Purpose

Manage the 8-bit sound synthesis engines using the Web Audio API for retro-style audio effects.

## Ownership

Sound Design Developers / Core Logic.

## Local Contracts

- Synthesize audio dynamically via Web Audio API, minimizing file downloads.
- Clean up oscillators and gain nodes properly to prevent memory leaks.

## Key Files

- `audioEngine.ts`: Module implementation.
- `pokemonCryPlayer.ts`: Module implementation.
- `soundDispatchMap.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
