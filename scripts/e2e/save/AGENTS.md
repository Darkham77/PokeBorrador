# Purpose

Save Shield scenario simulations validating the data corruption prevention layer and save restrictions.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Saving MUST abort immediately if the user has 0 Pokémon in total or if `starterChosen` is false.
- Visual save progress overlays and feedback modals must not activate when saving is blocked.

## Work Guidance

- Test save boundaries by injecting corrupted states into Pinia via the browser sandbox evaluate helper.
- Verify both the rejection status and the specific error message returned.

## Verification

- Run `npm run sim:e2e:save` to verify Save Shield rules.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
