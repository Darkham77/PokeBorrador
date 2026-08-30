# Maintenance Scripts Governance

General system maintenance scripts, import fixes, server configurations, and development plugins.

## Core Rules & Audit Guidelines

- **Master Audit Orchestrator (`audit_full.ts`)**: Serves as the central runner executing all sub-auditors dynamically via `auditScanner.ts`. Supports multi-rule propagation via `--rule` / `rule=<name>` to pass selective execution flags down to sub-auditors. It streams clean step-by-step progress lines to the console, displays consolidated Box-Drawing tables by family, and writes the complete structured JSON report to `scratch/audits/latest_audit.json`.
- **Shared Streaming Execution Engine (`scripts/lib/streamingRunner.ts`)**: Master runners (`audit_full.ts`, `audit_warnings_diff.ts`) MUST route all subprocess execution through `executeAuditorStreaming()`. This engine intercepts live stdout/stderr, strips internal Node.js permission warnings (`[PERM0002]`, `[PERM0006]`, `[DEP0190]`), extracts `🔍 [X/N]` sub-progress milestones, and renders dynamic formatted tree branches under each running suite.
- **Pre-Commit Gatekeeper (`audit_warnings_diff.ts`)**: Evaluates ESLint, TypeScript `vue-tsc`, and 100% of dynamically discovered sub-auditors in `scripts/auditors/` against `origin/main`. It enforces exactly 0 project errors and 0 new warnings in modified files. Pre-existing legacy warnings are summarized as a count in the terminal to avoid log flooding, and full detailed diffs are persisted to `scratch/audits/latest_warnings_diff.json` and `scratch/warnings_diff_report.json`.
- **Context-Aware Auto-Fixes**: All auto-fix functions inside `audit_rules.ts` must inspect property context (e.g. JS object `zIndex: 'var(...)'` vs CSS `z-index: var(...)`) to prevent injecting invalid syntax into Vue/TS component files.
- **Config Exemptions**: Root configuration files (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`) are exempt from standard SLOC thresholds via `AuditRule.exemptConfigFiles`.
- **Administrative CLI Contracts**: Maintenance scripts MUST implement `node:util parseArgs` with explicit typed options and provide `--help`:
  - `admin_supabase_users.ts` (`npm run servers:db:admin server=<profile> action=<action> email=<email> [password=<pass> | new-email=<email> | username=<name>]`)
  - `admin_rename.ts` (`npm run admin:rename user=<id_or_name> name=<new_name>`)
  - `repair_account_legality.ts` (`npm run db:repair-account [server=<profile>] [user=<id_or_email>] [all] [fix]`)
  - `diagnose_account.ts` (`npm run db:diagnose-account [server=<profile>] [file=<backup_json>] [db=<sqlite_path>] user=<id_or_email_or_name> [save-json=<path>]` / `npm run db:diagnose-accounts [server=<profile>] [file=<backup_json>] [db=<sqlite_path>]`)

## Child DOX Index

- [analyzers/AGENTS.md](./analyzers/AGENTS.md)
- [audit_showdown/AGENTS.md](./audit_showdown/AGENTS.md)
