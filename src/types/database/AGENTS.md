# Purpose

Database engine type contracts, SQLite abstractions, and query result interfaces.

## Ownership

Database & Storage Architects.

## Local Contracts

- **Multi-Engine Type Alignment**: Database interfaces must define uniform abstractions compatible with both SQLite and PostgreSQL.

## Key Files

- `sqlite.ts`: SQLite driver types, statements, memory database configurations, and query result structures.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run standard type checks and database parity tests (`npm run test:node`).

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
