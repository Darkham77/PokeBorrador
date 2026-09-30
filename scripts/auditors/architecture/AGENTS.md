# scripts/auditors/architecture/AGENTS.md

## Purpose & Scope

This directory contains host-specific architecture sub-auditor extensions for Poké Vicio. Generic architecture suites (AST rules, Fallow integration, Z-Index, CSS duplicates, bundle budget, Vue SFC hygiene, etc.) reside in `packages/auditor/src/suites/architecture/`.

## Directory Structure & Files

- [validate_battle_ui_branching.ts](./validate_battle_ui_branching.ts): Audits battle UI components to prevent bifurcated combat screens and enforce canonical arena reuse (`BattleArena.vue`, polymorphic `BattleSession`).
- [validate_client_sim_decoupling.ts](./validate_client_sim_decoupling.ts): Audits client-side source files in `src/` (excluding Web Workers) for illegal runtime value imports from `@pkmn/sim` and `@pkmn/randoms`, enforcing complete simulation decoupling, 100% hard ERRORS only, and zero bypass/ignore escape hatches.

## Local Governance & Rules

- All host extensions in this family extend `BaseAuditor` or `FileScanAuditor` from `@fgp/auditor`.
- **Mandatory Showdown Decoupling & Zero-Ignore Governance**: Client application code must remain strictly decoupled from `@pkmn/sim` and `@pkmn/randoms`. The auditor `validate_client_sim_decoupling.ts` enforces this with 100% hard errors (exit code 1) and absolutely zero ignore directives or bypass tokens (`// sim-ok` is strictly forbidden).
- **Battle UI Branching Governance**: Ensures combat arena and controls are never duplicated across game modes.
- Both suites are registered in `audit.config.ts` under `extensions`.
