# Purpose

Handle level-up evolutions, trade evolutions, and evolution item requirements.

## Ownership

Core Logic Developers.

## Local Contracts

- Strictly use English IDs for evolution items.
- Ensure all evolution checks leave a determinable result state.
- **Trade Evolution Catalysts (`linkcable`)**: In `checkStoneEvolution`, trade evolution items like `linkcable` must delegate dynamically to `getTradeEvolution(pokemon.id)` to trigger trade evolutions (e.g. Kadabra -> Alakazam, Machoke -> Machamp) without requiring an online multiplayer trade.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
