# Purpose

Daycare daily missions scenario simulations validating requirement filtering, submission flow, and reward redemption.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Active Pokemon in daycare missions must be permanently consumed or removed as specified by the mission reward protocol.
- Check that invalid level, nature, or stat submissions are immediately rejected.

## Work Guidance

- Verify inventory increments and PC Box decrements during `completeMission` actions.

## Verification

- Run `npm run sim:e2e:missions` to verify daycare missions simulations.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
