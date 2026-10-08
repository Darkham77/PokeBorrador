# Purpose

Handle level-up evolutions, trade evolutions, and evolution item requirements.

## Ownership

Core Logic Developers.

## Local Contracts

- Strictly use English IDs for evolution items.
- Ensure all evolution checks leave a determinable result state.
- **Trade Evolution Catalysts (`linkcable`)**: In `checkStoneEvolution`, trade evolution items like `linkcable` must delegate dynamically to `getTradeEvolution(pokemon.id)` to trigger trade evolutions (e.g. Kadabra -> Alakazam, Machoke -> Machamp) without requiring an online multiplayer trade.

## Key Files

- `evolutionLogic.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
