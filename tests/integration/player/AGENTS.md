# Purpose

Integration test suites validating player class lifecycles, class missions deployments, server time validations, and progression systems across active database engines.

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Validates end-to-end class deployment lifecycle, including deployment start, persistence, and collection resolution across player classes (Rocket, Cazabichos, Entrenador, Criador).

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
