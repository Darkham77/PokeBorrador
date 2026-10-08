# Purpose

Single Source of Truth (SSoT) test matrix and definitions for all 11 Item Families in Poké Vicio.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Exports `ITEM_FAMILIES_MATRIX` with representative items, target setups, and verification assertions for each mechanical family.

## Key Files

- [`itemFamiliesMatrix.ts`](./itemFamiliesMatrix.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
