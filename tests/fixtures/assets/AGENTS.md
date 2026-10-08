# Purpose

Static domain fixtures and legacy snapshots for sprite geometries, asset catalogs, and bounding boxes.

## Ownership

Asset Pipeline Engineers / Quality Assurance.

## Local Contracts

- Fixtures must remain static and frozen.
- Snapshots are reserved for regression and backwards-compatibility assertions.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
