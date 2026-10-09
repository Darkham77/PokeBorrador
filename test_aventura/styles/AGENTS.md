# Purpose

This directory provides CSS stylesheets and animation keyframes scoped strictly to the adventure prototype sandbox.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Styles here are isolated to `test_aventura` and must not pollute global production stylesheets in `src/styles/`.

## Key Files

- [`animations.css`](./animations.css): Encapsulated CSS keyframe animations for prototype elements.

## Work Guidance

- Ensure rules do not leak into outer DOM trees when loaded in `index.html`.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
