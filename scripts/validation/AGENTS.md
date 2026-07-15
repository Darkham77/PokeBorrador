# Purpose

Validation scripts for battle FSM structures, abilities, items, moves, and translations matching.

## Child DOX Index

- [validate_abilities.ts](./validate_abilities.ts): Validates local ability tables against Showdown Dex.
- [validate_fsm_diagrams.ts](./validate_fsm_diagrams.ts): Confirms FSM Mermaid diagrams match state machine files.
- [validate_fsm_flow_parity.ts](./validate_fsm_flow_parity.ts): Validates code execution flow against FSM graphs.
- [validate_fsm_implementation.ts](./validate_fsm_implementation.ts): Audits FSM files state completeness.
- [validate_items.ts](./validate_items.ts): Audits physical item effects implementation.
- [validate_moves.ts](./validate_moves.ts): Validates moves properties and learnsets against official databases.
- [validate_sandbox_moves_tooltip.ts](./validate_sandbox_moves_tooltip.ts): Verifies hover/tooltip states for sandbox moves.
- [validate_translations.ts](./validate_translations.ts): Audits moves/abilities Spanish translations.
- [fix_showdown_descriptions.ts](./fix_showdown_descriptions.ts): Corrects move description formatting.
- [validate_spanish_ids.ts](./validate_spanish_ids.ts): Detects hardcoded Spanish strings used as logical IDs in src/.

## validate_spanish_ids.ts

Detector script that loads all Spanish translation names from
`abilities.json`, `moves.json`, and `items.json`, then scans `src/` for
hardcoded Spanish strings that might be used as logical IDs.

Run: `node --experimental-strip-types scripts/validation/validate_spanish_ids.ts`
Output: `scratch/spanish_id_report.md`

Scope is intentionally restricted to `src/` — `scripts/` and `tests/` are
excluded because they legitimately contain Spanish migration maps and display
label helpers.

**Rule**: Any entry in the report with a correct `id:` field in English and
`name:` in Spanish is a legitimate display string — no action needed.
Only entries where the Spanish string IS the ID (used in comparisons,
lookups, or logic) must be fixed.
