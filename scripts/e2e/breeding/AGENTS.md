# Purpose

Breeding scenario simulations validating daycare parent deposits, egg generation timing, and GSAP egg hatching sequences.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Breeding simulations verify that newborn Pokemon level-up and moves at birth are correctly registered.
- Modifying parent parameters (like deposited_at) via the browser sandbox is permitted to skip waiting times.

## Work Guidance

- Ensure `breeding.sim.ts` covers the full cycle from deposit to hatch, verifying team/box states after the hatch sequence.

## Verification

- Run `npm run sim:e2e:breeding` to verify breeding simulations.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
