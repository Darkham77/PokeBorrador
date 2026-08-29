# Purpose

Domain module for all static, runtime, domain, database, FSM, and asset auditors in the Poké Vicio project.

## Ownership

Tooling / Quality Engineers.

## Directory Navigation Index

- [scripts/auditors/architecture/AGENTS.md](./architecture/AGENTS.md): AST rules, Fallow intelligence, Z-index sync, CSS checker, constant duplicates.
- [scripts/auditors/assets/AGENTS.md](./assets/AGENTS.md): Pokemon sprites coverage, item sprite collisions.
- [scripts/auditors/documentation/AGENTS.md](./documentation/AGENTS.md): Relative links and DOX hierarchy integrity.
- [scripts/auditors/domain_data/AGENTS.md](./domain_data/AGENTS.md): Domain types integrity, Pokemon DB, moves, abilities, items, translations, Spanish IDs, tooltip mechanics.
- [scripts/auditors/fsm/AGENTS.md](./fsm/AGENTS.md): Mermaid diagrams parity, FSM implementation, flow parity, transition coverage.
- [scripts/auditors/persistence/AGENTS.md](./persistence/AGENTS.md): SQLite in-memory migrations, save schema migrations, backup fixtures.

## Local Contracts

- **Universal Audit Behavior (Console Summary + JSON in Scratch)**: Every auditor in this directory executes under a single, universal standard:
  1. **Console (`stdout`)**: ALWAYS outputs formatted step-by-step progress lines followed by the clean human visual summary table (Box-Drawing borders, standardized badges `[ ✅ PASS ]`, `[ ❌ FAIL ]`, `[ ⚠️ WARN ]`, aligned duration, domain metrics, and error/warning counts).
  2. **Disk (`scratch/audits/`)**: ALWAYS writes the 100% complete structured JSON conforming to `StandardAuditResult` to `scratch/audits/<family>/<id>.json` (and `scratch/audits/latest_audit.json` for global runs). AI agents needing line-level details must read `scratch/audits/latest_audit.json` directly from disk.
- **Direct Execution Guard Mandate**: Top-level `main()` invocations MUST be guarded with `if (import.meta.url === \`file://${process.argv[1]}\` || process.argv[1]?.endsWith(...))` so tests can import functions without triggering CLI side effects.
- **Dynamic Auto-Discovery Policy**: The master audit orchestrator (`scripts/maintenance/audit_full.ts` via `scripts/maintenance/auditScanner.ts`) scans this directory recursively. Every `.ts` auditor file is automatically discovered and incorporated into the general audit run. No auditor is ever left out.
- **Family Subfolder Convention**: Auditors MUST be organized by domain family subfolders:
  - `architecture/`: AST rules, Fallow intelligence, Z-index sync, CSS checker, constant duplicates.
  - `domain_data/`: Domain types integrity, Pokemon DB, moves, abilities, items, translations, Spanish IDs, tooltip mechanics.
  - `persistence/`: SQLite in-memory migrations, save schema migrations, backup fixtures.
  - `fsm/`: Mermaid diagrams parity, FSM implementation, flow parity, transition coverage.
  - `assets/`: Pokemon sprites coverage, item sprite collisions.
  - `documentation/`: Relative links and DOX hierarchy integrity.

## Work Guidance

- Use `setupAuditor()` from `scripts/lib/auditorBase.ts` (or `setupValidation()` from `scripts/lib/validationBase.ts`) to initialize and finish audits.
- Always declare descriptive metrics (`setMetric()`) and structured findings (`addError()`, `addWarning()`, `addFinding()`).
- Keep sub-auditors fast and deterministic.

## Verification

- Run `npm run audit` to verify all auditors execute with unified table styling and generate reports in `scratch/audits/`.
- Run `npx vitest run tests/unit/maintenance/test_audit_system.spec.ts` for unit test verification.
