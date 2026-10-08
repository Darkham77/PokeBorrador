# Purpose

This directory contains reusable composition state logic and lifecycle helpers for the inventory system, such as shop interactions, filtering, and animations.

## Ownership

- Poke Vicio UI Architecture Team

## Local Contracts

- All UI animations for shops and items must be orchestrated using GSAP.
- Shop components must consume state and filtering logics from hooks inside this directory.

## Key Files

- `useShopLogic.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
