# Purpose

Unit and integration parity tests comparing Pokémon Showdown engine behavior with local bridge and battle store logic.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- Follow repository architecture, clean code standards, and strict domain typing.
- Ensure strict module decoupling and zero side-effects.

## Work Guidance

- **Parity Verification**: These tests validate historical fixes, protocol tokens, stat boosts, field weather, and volatile statuses against Showdown standards.
- **Strict Parity**: No custom overrides or non-Showdown behavior should be asserted here.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
