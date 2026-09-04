# Purpose

End-to-end scenario simulations for in-game item families, covering immediate use, deferred multi-step modal interactions, and debug-driven time manipulation.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Simulations in this directory exercise item interactions across all 11 item families against the live browser environment.
- Any time-based buff expiration test MUST advance time using `window.__VITE_DEBUG__.advanceBuffSeconds` or `window.__VITE_DEBUG__.setBuffDuration`, strictly prohibiting `page.waitForTimeout` or artificial delays.
- Tests executing stone evolutions must explicitly clear `uiStore.evolutionData = null` after applying `evolvePokemonData` before saving to respect the evolution Save Shield.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
