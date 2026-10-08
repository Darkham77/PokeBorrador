# Purpose

Unit tests for battle UI components and subcomponents.

## Ownership

Battle UI Developers / QA Engineers.

## Local Contracts

- Test component mounting, props, and DOM rendering for battle tooltips, modifiers, and battle UI sections under jsdom.
- `test_move_tooltip_modifiers.spec.ts`: Unit tests verifying power calculations, weather/terrain modifiers, recovery/recoil text, and tactical notes in move tooltips.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` to verify battle component unit tests.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
