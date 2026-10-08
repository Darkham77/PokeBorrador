# Purpose

Integration test suites validating real-time Player vs Player (PvP) battle flows, invite lifecycles, and opponent connectivity.

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Validates multi-seat invite states, presence, offline cancellation, and realtime broadcast handling.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
