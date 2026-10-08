# Purpose

This directory contains Finite State Machine (FSM) validators verifying parity between Mermaid state diagrams and runtime battle state machines.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and use `setupValidation` or `setupAuditor`.

## Key Files

- [_fsmParityParser.ts](./_fsmParityParser.ts): Helper module providing source code scanning and dynamic state detection.
- [_validate_fsm_all.ts](./_validate_fsm_all.ts): Aggregated runner executing the entire FSM validation suite.
- [validate_combat_invariants.ts](./validate_combat_invariants.ts): Validates combat invariant rules and battle state transitions.
- [validate_fsm_diagrams.ts](./validate_fsm_diagrams.ts): Validates Mermaid diagram syntax and transitions in mechanics documentation.
- [validate_fsm_flow_parity.ts](./validate_fsm_flow_parity.ts): Compares diagram transition flow against implementation transitions.
- [validate_fsm_implementation.ts](./validate_fsm_implementation.ts): Audits FSM constants, transition calls, and sub-state handlers.
- [validate_showdown_parity.ts](./validate_showdown_parity.ts): Validates Pokémon Showdown protocol token parity and battle event handler coverage.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
