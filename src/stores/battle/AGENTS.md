# Purpose

Manage battle instance states, buffs, and visual shadows for combatants.

## Ownership

Battle Engine Team / Visual FX Programmers.

## Local Contracts

- For any battle engine or FSM transitions, always conform to FSM diagrams using the validation scripts.
- Visual state orchestrations must use GSAP timelines and deterministic promises.

## Work Guidance

- Never mix visual representation timings with pure battle state evaluations.
- Use explicit resource management or cleanup loops on unmount.

## Verification

- Run `validate_fsm_implementation.ts` and `npm run test:node`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
