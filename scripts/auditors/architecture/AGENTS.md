# Purpose

This directory contains host-specific architecture sub-auditor extensions for Poké Vicio. Generic architecture suites (AST rules, Fallow integration, Z-Index, CSS duplicates, bundle budget, Vue SFC hygiene, etc.) reside in `node_modules/@francogp/auditor/src/suites/architecture/`.

## Ownership

Architecture & Tooling Engineers.

## Local Contracts

- All host extensions in this family extend `BaseAuditor` or `FileScanAuditor` from `@francogp/auditor`.
- **Mandatory Showdown Decoupling & Zero-Ignore Governance**: Client application code must remain strictly decoupled from `@pkmn/sim` and `@pkmn/randoms`. The auditor `validate_client_sim_decoupling.ts` enforces this with 100% hard errors (exit code 1) and absolutely zero ignore directives or bypass tokens (`// sim-ok` is strictly forbidden).
- **Battle UI Branching Governance**: Ensures combat arena and controls are never duplicated across game modes.
- Both suites are registered in `audit.config.ts` under `extensions`.

## Key Files

- [validate_battle_ui_branching.ts](./validate_battle_ui_branching.ts): Audits battle UI components to prevent bifurcated combat screens and enforce canonical arena reuse (`BattleArena.vue`, polymorphic `BattleSession`).
- [validate_client_sim_decoupling.ts](./validate_client_sim_decoupling.ts): Audits client-side source files in `src/` (excluding Web Workers) for illegal runtime value imports from `@pkmn/sim` and `@pkmn/randoms`, enforcing complete simulation decoupling, 100% hard ERRORS only, and zero bypass/ignore escape hatches.

## Work Guidance

- Ensure any new architectural rules inherit directly from BaseAuditor or FileScanAuditor.
- Maintain pure diagnostic reporting without console pollution.

## Verification

- Run architecture sub-auditor suites: `npm run audit suites=validate_battle_ui_branching,validate_client_sim_decoupling`
- Run lint suite: `npm run audit:lint`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
