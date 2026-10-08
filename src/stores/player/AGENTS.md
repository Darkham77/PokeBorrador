# Purpose

Manage player profile info, player class configuration, profile customization/cosmetics, and search indexes.

## Ownership

UI/UX Team / Profile Systems Engineers.

## Local Contracts

- Gender is a save property (signup only). Do not query or request gender selection on login flows.
- Class choices and achievement flags must be sanitized before persisting.

## Key Files

- `cosmetics.ts`: Module implementation.
- `playerClass.ts`: Module implementation.
- `playerClassHelper.ts`: Module implementation.
- `playerSearch.ts`: Module implementation.
- `profile.ts`: Module implementation.

## Work Guidance

- Access stats and classes using central data structures to prevent desynchronization.

## Verification

- Run `npm run audit`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
