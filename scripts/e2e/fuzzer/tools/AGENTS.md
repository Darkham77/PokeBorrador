# Purpose

Headless execution debugging, diagnostic tools, and parity comparison helpers.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Tools must run under Node 26+ and utilize `--permission` flags.
- They must not modify the production save database profiles.

## Key Files

- `validate_certified_cases.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
