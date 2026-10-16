# Purpose

This directory provides CSS stylesheets and animation keyframes scoped strictly to the adventure prototype sandbox.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Styles here are isolated to `test_aventura` and must not pollute global production stylesheets in `src/styles/`.

## Key Files

- [`animations.scss`](./animations.scss): Encapsulated SCSS keyframe animations for prototype elements.
- [`modals.scss`](./modals.scss): Encapsulated modal styles for prototype interface dialogs.

## Work Guidance

- Ensure rules do not leak into outer DOM trees when loaded in `index.html`.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
