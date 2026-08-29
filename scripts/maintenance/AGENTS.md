# Maintenance Scripts Governance

General system maintenance scripts, import fixes, server configurations, and development plugins.

## Core Rules & Audit Guidelines

- **Master Audit Orchestrator (`audit_full.ts`)**: Serves as the central runner executing all sub-auditors dynamically via `auditScanner.ts`. It streams clean step-by-step progress lines to the console, displays consolidated Box-Drawing tables by family, and writes the complete structured JSON report to `scratch/audits/latest_audit.json`.
- **Pre-Commit Gatekeeper (`audit_warnings_diff.ts`)**: Evaluates ESLint, TypeScript `vue-tsc`, and 100% of dynamically discovered sub-auditors in `scripts/auditors/` against `origin/main`. It enforces exactly 0 project errors and 0 new warnings in modified files. Pre-existing legacy warnings are summarized as a count in the terminal to avoid log flooding, and full detailed diffs are persisted to `scratch/audits/latest_warnings_diff.json` and `scratch/warnings_diff_report.json`.
- **Context-Aware Auto-Fixes**: All auto-fix functions inside `audit_rules.ts` must inspect property context (e.g. JS object `zIndex: 'var(...)'` vs CSS `z-index: var(...)`) to prevent injecting invalid syntax into Vue/TS component files.
- **Config Exemptions**: Root configuration files (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`) are exempt from standard SLOC thresholds via `AuditRule.exemptConfigFiles`.

## Child DOX Index

- [analyzers/AGENTS.md](./analyzers/AGENTS.md)
- [audit_showdown/AGENTS.md](./audit_showdown/AGENTS.md)
