# Purpose

Pokedex search filters and details view logic.

## Ownership

Pokemon UI Team / Frontend Developers.

## Local Contracts

- **Storage Index vs UID Parity in Detail Views**: Detail composables (`usePokemonDetail`) must validate that `directPokemon.uid` strictly matches the Pokémon at the given storage index in `team` or `box`. If a mismatch occurs (e.g. index passed from a filtered list or stale cache), the composable must resolve the true slot by `uid` or fall back safely to `directPokemon` to guarantee that the UI never displays an unrelated Pokémon instance.

## Verification

- Run standard type checks.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
