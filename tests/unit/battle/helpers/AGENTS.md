# Purpose

Unit test suites for battle auxiliary helper functions and state resolution routines.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- Follow repository architecture, clean code standards, and strict domain typing.
- Ensure strict module decoupling and zero side-effects.

## Work Guidance

- Verify battle state helper logic and boundary conditions with deterministic isolated unit tests.
- `policeResolution.spec.ts`: Unit tests for `handlePoliceResolution` validating archetype-based resolution (`policeman`), dynamic NPC names, defeat bail calculations, and criminality resets.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
