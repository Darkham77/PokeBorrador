# Purpose

Showdown sandbox module for offline combat simulation and testing.

## Ownership

Core Combat / Simulation Engineers.

## Local Contracts

- Must maintain compatibility with `@pkmn/sim`.
- Sandbox storage data must sync using Pinia stores.

## Child DOX Index

- [components/](./components/): Visual components for team building and battlefield.
- [logic/](./logic/): Custom simulation animations and execution loops.
- [sandbox_db/](./sandbox_db/): Local database cloner and log parser engines.
- [stores/](./stores/): Pinia sandbox state store.
- [tests/](./tests/): Parser diagnostics and offline test files.
- [views/](./views/): Simulation UI entry view.
