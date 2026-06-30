# Purpose

Breeding E2E tests validating daycare parent deposits, egg generation timing, and GSAP egg hatching sequences.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Breeding E2E tests verify that newborn Pokemon level-up and moves at birth are correctly registered.
- Modifying parent parameters (like deposited_at) via the browser sandbox is permitted to skip waiting times.

## Work Guidance

- Ensure `breeding.spec.ts` covers the full cycle from deposit to hatch, verifying team/box states after the hatch sequence.

## Verification

- Run `npm run test:e2e:breeding` to verify breeding tests.
