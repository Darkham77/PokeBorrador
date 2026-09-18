# Purpose

Unit tests for Vue Router data loaders and preloading functions.

## Ownership

Frontend Developers / Quality Engineers.

## Local Contracts

- **Loader Unit Testing**: Tests in this directory verify data loader invocation, caching, and reactivity parity.
- **Node Environment**: Uses Vitest node environment with mocked or active Pinia instances.

## Work Guidance

- Test loader behavior under success and error states.

## Verification

- Run `npm run test:unit tests/unit/loaders/`
