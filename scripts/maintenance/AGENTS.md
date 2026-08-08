# Maintenance Scripts Governance

General system maintenance scripts, import fixes, server configurations, and development plugins.

## Core Rules & Audit Guidelines

- **Context-Aware Auto-Fixes**: All auto-fix functions inside `audit_rules.ts` must inspect property context (e.g. JS object `zIndex: 'var(...)'` vs CSS `z-index: var(...)`) to prevent injecting invalid syntax into Vue/TS component files.
- **Config Exemptions**: Root configuration files (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`) are exempt from standard SLOC thresholds via `AuditRule.exemptConfigFiles`.

## Child DOX Index

- [audit_showdown/AGENTS.md](./audit_showdown/AGENTS.md)
