# Purpose

Playwright E2E simulation suites verifying Pokémon UI components, friendship seals and ribbons, and inventory interaction in browser contexts.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations verify DOM visibility and interactive components using passive locators.
- All actions must respect the 5s timeout mandate and avoid artificial timers.

## Work Guidance

- Maintain test coverage for friendship seals, badges, and box filtering behaviors.

## Verification

- Run suite via Playwright: `npx playwright test scripts/e2e/pokemon/`

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
