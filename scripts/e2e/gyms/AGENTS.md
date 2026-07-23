# Purpose

Gym progression scenario simulations validating challenge loops, consecutive trainers, and badge/money rewards.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Defeating a gym leader MUST award the corresponding Badge and update `defeatedGyms` in the gameStore state.
- Verify that escaping is disabled (`cannotEscape: true`) for gym challenges.

## Work Guidance

- Simulate gym battle triggers via `challengeGym` actions in `gymsStore` from the browser console, running combat turns automatically to verify victory flow.

## Verification

- Run `npm run sim:e2e:gyms` to verify gym progression simulations.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
