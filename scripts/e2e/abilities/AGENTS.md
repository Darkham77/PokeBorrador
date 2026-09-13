# Purpose

Playwright E2E browser test simulations for verifying Pokémon out-of-battle field abilities, modifiers coordinator, attraction, and daycare step progression.

## Ownership

QA / Simulation Engineers.

## Local Contracts

- 100% ID-based and stable locators.
- Coordinated with `src/logic/rules/fieldRulesCoordinator.ts`.
- Zero arbitrary timers or magic numbers.

## Work Guidance

- Simulations follow the 7-step Playwright testing protocol.

## Verification

- Run `npm run sim:e2e:abilities` to execute out-of-battle abilities simulations.

## Child DOX Index

- _This directory does not contain nested sub-directories._
