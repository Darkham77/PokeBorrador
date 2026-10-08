# Purpose

Node runtime unit and integration tests for asset bounding boxes, sprite geometry calculation, and asset catalog builders.

## Ownership

Asset Pipeline Engineers / Quality Assurance.

## Local Contracts

- Tests under `tests/node/assets/` must be 100% deterministic and self-contained.
- Avoid runtime dependence on uncommitted or external network sprite sources.
- **Historical Regression Fixtures**: Never use dynamic `git show HEAD:...` for historical parity checks; once committed, HEAD becomes the modified snapshot. Historical regression tests must assert against immutable frozen fixtures in `tests/fixtures/assets/`.
- **Separation of Automatic Calculations & Manual Overrides**: Tests verifying coordinate databases (such as `pokemonFeetDatabase.ts`) MUST separate automatic calculation parity assertions (comparing unmodified sprites against baseline static snapshots) from manual override assertions (`spriteShadowOverrides.json`). Never mix automatic baseline regression and manual calibration overrides into a single test loop.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
