# Purpose

Node.js unit tests for headless UI state logic and composables (such as slot reordering and drag-and-drop algorithms).

## Ownership

Frontend Developers / UI State Engineers.

## Local Contracts

- **Headless Node Environment**: Tests in this directory must only test pure algorithmic and headless UI state helpers (e.g. useSlotReorder) without requiring browser DOM or component mounting.
- **Deterministic Array Transformations**: Slot reorder algorithms must be tested for boundary conditions (bounds checking, same-slot swaps, empty slots, and reactive array updates).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
