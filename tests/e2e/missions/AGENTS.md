# Purpose

Daycare daily missions E2E tests validating requirement filtering, submission flow, and reward redemption.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Active Pokemon in daycare missions must be permanently consumed or removed as specified by the mission reward protocol.
- Check that invalid level, nature, or stat submissions are immediately rejected.

## Work Guidance

- Verify inventory increments and PC Box decrements during `completeMission` actions.

## Verification

- Run `npm run test:e2e:missions` to verify daycare missions tests.
