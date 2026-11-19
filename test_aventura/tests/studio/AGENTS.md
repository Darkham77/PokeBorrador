# Purpose

Unit and component test suites for developer studios and asset mapping tools.

## Ownership

Frontend QA / Tooling Developers.

## Local Contracts

- `assetAtlasGrid.spec.ts`: Component test verifying grid rendering, asset selection, and canvas coordinate translations.
- `regionalBrushDock.spec.ts`: Component test validating brush mode switching, category tabs, eyedropper sync, parameter controls, and Defect Inspector domain navigation in `RegionalBrushDock.vue`.

## Work Guidance

- Use Vitest and Vue Test Utils exclusively.
- Zero timers in test assertions.

## Verification

- `npm run test`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
