# Purpose

End-to-end scenario simulations for in-game item families, covering immediate use, deferred multi-step modal interactions, and debug-driven time manipulation.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Simulations in this directory exercise item interactions across all 11 item families against the live browser environment.
- Any time-based buff expiration test MUST advance time using `window.__VITE_DEBUG__.advanceBuffSeconds` or `window.__VITE_DEBUG__.setBuffDuration`, strictly prohibiting `page.waitForTimeout` or artificial delays.
- Tests executing stone evolutions must explicitly clear `uiStore.evolutionData = null` after applying `evolvePokemonData` before saving to respect the evolution Save Shield.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run sim:e2e:items` to execute item families and time manipulation simulations.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
