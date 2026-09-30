# Purpose

Domain module hosting all 19 domain-specific host extension sub-auditors for the Poké Vicio project. Generic static analysis suites reside in the standalone package `packages/auditor/src/suites/`.

## Ownership

Tooling / Quality Engineers.

## Directory Navigation Index

- [scripts/auditors/architecture/AGENTS.md](./architecture/AGENTS.md): Host architecture extensions (battle UI branching, client-sim decoupling).
- [scripts/auditors/assets/AGENTS.md](./assets/AGENTS.md): Pokemon sprites coverage, item sprite collisions, asset usage.
- [scripts/auditors/domain_data/AGENTS.md](./domain_data/AGENTS.md): Domain integrity for Pokemon DB, moves, abilities, items, Spanish IDs, spawns whitelist.
- [scripts/auditors/fsm/AGENTS.md](./fsm/AGENTS.md): Mermaid diagrams parity, FSM implementation, flow parity, combat invariants, Showdown parity.
- [scripts/auditors/persistence/AGENTS.md](./persistence/AGENTS.md): SQLite in-memory migrations, save persistence parity, database schema parity.

*Note: 35 generic built-in suites across architecture, domain data, persistence, and documentation reside in `packages/auditor/src/suites/`.*

## Local Contracts

- **Mandatory OOP Inheritance Mandate**: Every host extension sub-auditor in this directory MUST inherit from either `BaseAuditor<TRuleId>` or `FileScanAuditor<TRuleId>` imported from `@fgp/auditor`. Creating standalone procedural scripts, custom directory walkers, or ad-hoc result printers is strictly forbidden.
- **Audit Configuration Registration**: All 19 host extension sub-auditors MUST be explicitly registered in `audit.config.ts` under `extensions`.
- **Single Source of Truth Directory Ignore Mandate (`CANONICAL_IGNORE_DIRS`)**: Sub-auditors in this directory MUST NEVER declare local ignore sets (`const IGNORE_DIRS`, `const SKIP_DIRS`). All directory ignores MUST be sourced strictly from `CANONICAL_IGNORE_DIRS` in `@fgp/auditor`.
- **Universal Scratch Isolation & Ephemeral Asset Mandate**: All temporary databases, test simulation exports, reports, and local backup imports MUST reside strictly inside `scratch/`. Source code trees (`src/`, `database/`, `scripts/`, `tests/`) MUST NEVER contain temporary directories or files.
- **Auditor Test Environment Isolation Mandate (`projectRoot`)**: Sub-auditors accepting custom directory roots or mock sandboxes MUST forward `projectRoot` into `super({...})` (`AuditorOptions.projectRoot`), ensuring unit tests executing within temporary sandbox directories never scan the live repository.
- **Shared AST Engine & Zero Duplicate Parse Mandate**: Sub-auditors performing TypeScript AST analysis MUST declare `requiresAst: true` and consume `SharedAstContext`. Independent AST parsing in isolated loops is strictly forbidden.
- **Universal Audit Behavior (Console Summary + JSON in Scratch)**: Every auditor in this directory executes under a single, universal standard:
  1. **Console (`stdout`)**: Outputs formatted step-by-step progress lines followed by the Box-Drawing summary table (`[ ✅ PASS ]`, `[ ❌ FAIL ]`, `[ ⚠️ WARN ]`).
  2. **Disk (`scratch/audits/`)**: Writes structured JSON conforming to `StandardAuditResult` to `scratch/audits/<family>/<id>.json` (and `scratch/audits/latest_audit.json` for global runs).
- **Official NPM Scripts Execution Mandate**: All developer verification, linting, and audit tasks MUST be invoked through official scripts defined in `package.json` (`npm run audit`, `npm run audit:findings`, `npm run lint`).
- **Direct Execution Guard Mandate**: CLI entrypoints MUST be guarded with `if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) { await BaseAuditor.runCli(new MyAuditor()); }`.

## Work Guidance

- Refer to the dedicated skill [auditor-framework](../../.agents/skills/auditor-framework/SKILL.md) for detailed implementation patterns, architectural standards, and bundled templates.
- Subclass `FileScanAuditor` for line-by-line file scanners and `BaseAuditor` for multi-source/composite audits.
- Keep sub-auditors fast and deterministic.

## Verification

- Run `npm run audit` to verify all 54 suites (35 built-in + 19 host extensions) execute with unified table styling.
- Run `npm run test:node` for unit test verification.
