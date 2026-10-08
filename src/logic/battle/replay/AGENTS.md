# Purpose

Tactical battle replay engine, turn-by-turn stepping orchestrator, and fog-of-war reveal tracker for spectator mode.

## Ownership

Battle Engine / Spectator Systems.

## Local Contracts

- **Showdown Parity**: Replays execute on deterministic choices and initial seeds.
- **Fog of War**: Moves, items, and abilities are revealed strictly upon occurrence in Showdown combat logs.
- **Event-Driven & Zero Timers**: Stepping and playback are driven by user controls or GSAP timeline events without arbitrary timeouts.

## Key Files

- `tacticalReplayEngine.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
