# Maintenance Analyzers Directory

This directory houses modular static analysis engines used by the project audit pipeline (`audit_project.ts`).

## Analyzers

- [constantAnalyzer.ts](./constantAnalyzer.ts): Scans codebase modules for duplicate constant definitions.
- [cssAnalyzer.ts](./cssAnalyzer.ts): Runs `css-checker` to locate duplicate CSS/SCSS selectors and styling rules.
- [doxAnalyzer.ts](./doxAnalyzer.ts): Validates project-wide `AGENTS.md` hierarchy, links, and documentation integrity.
