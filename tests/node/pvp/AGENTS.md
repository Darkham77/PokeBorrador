# Purpose

Node.js unit tests validating Player vs Player (PvP) persistence, serialization, team actions, and state restoration.

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Verifies dedicated PvP team actions (3v3 and 6v6) and database persistence across reconnects without mutation of adventure teams.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
