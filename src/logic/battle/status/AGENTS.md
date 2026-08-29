# src/logic/battle/status/AGENTS.md

## Purpose & Scope

This directory encapsulates individual status condition engines and volatile status handlers for turn-end and active-combat phases.

## Directory Structure & Files

- [primaryStatusEngine.ts](./primaryStatusEngine.ts): Manages primary status condition damage ticks (`brn`, `psn`, `tox`), visual status icons, and bad poison escalation.
- [volatileStatusEngine.ts](./volatileStatusEngine.ts): Manages volatile status ticks, countdown timers, and special effects (`yawn`, `lockedmove`, `partiallytrapped`, `disabled`, `encore`, `taunt`, `thrash`, `bound`, `ingrain`, `perishSong`, `cursed`).

## Local Governance & Rules

- All status ticks must remain deterministic and zero-timer compliant.
- Use `requireVolatileStatusKey` to guarantee domain-type safety when manipulating dynamic volatile counters.
