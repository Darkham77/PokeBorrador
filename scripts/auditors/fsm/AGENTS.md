# scripts/auditors/fsm/AGENTS.md

## Purpose & Scope

This directory contains Finite State Machine (FSM) validators verifying parity between Mermaid state diagrams and runtime battle state machines.

## Directory Structure & Files

- [_fsmParityParser.ts](./_fsmParityParser.ts): Helper module providing source code scanning and dynamic state detection.
- [_validate_fsm_all.ts](./_validate_fsm_all.ts): Aggregated runner executing the entire FSM validation suite.
- [validate_fsm_diagrams.ts](./validate_fsm_diagrams.ts): Validates Mermaid diagram syntax and transitions in mechanics documentation.
- [validate_fsm_flow_parity.ts](./validate_fsm_flow_parity.ts): Compares diagram transition flow against implementation transitions.
- [validate_fsm_implementation.ts](./validate_fsm_implementation.ts): Audits FSM constants, transition calls, and sub-state handlers.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and use `setupValidation` or `setupAuditor`.
