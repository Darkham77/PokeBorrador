# Purpose

Unit tests for authentication, save state serialization, and persistence helpers.

## Ownership

Backend / Security Architects.

## Local Contracts

- Test save state serializations and gender transformations.
- `test_battle_serializer_helper.spec.ts`: Unit tests verifying active battle serialization and state mapping.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` to verify auth unit tests.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
