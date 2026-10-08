# Purpose

Node.js unit tests for headless UI state logic and composables (such as slot reordering and drag-and-drop algorithms).

## Ownership

Frontend Developers / UI State Engineers.

## Local Contracts

- **Headless Node Environment**: Tests in this directory must only test pure algorithmic and headless UI state helpers (e.g. useSlotReorder) without requiring browser DOM or component mounting.
- **Deterministic Array Transformations**: Slot reorder algorithms must be tested for boundary conditions (bounds checking, same-slot swaps, empty slots, and reactive array updates).

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
