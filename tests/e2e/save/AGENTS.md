# Purpose

Save Shield E2E tests validating the data corruption prevention layer and save restrictions.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Saving MUST abort immediately if the user has 0 Pokémon in total or if `starterChosen` is false.
- Visual save progress overlays and feedback modals must not activate when saving is blocked.

## Work Guidance

- Test save boundaries by injecting corrupted states into Pinia via the browser sandbox evaluate helper.
- Verify both the rejection status and the specific error message returned.

## Verification

- Run `npm run test:e2e:save` to verify Save Shield rules.
