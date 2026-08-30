# Maintenance Analyzers Directory

This directory houses modular static analysis engines used by the project audit pipeline (`audit_project.ts`).

## Analyzers & Descriptors

- [constantAnalyzer.ts](./constantAnalyzer.ts): Scans codebase modules for duplicate constant definitions. Exports `CONSTANT_ANALYZER_DESCRIPTOR`.
- [cssAnalyzer.ts](./cssAnalyzer.ts): Runs `css-checker` to locate duplicate CSS/SCSS selectors and styling rules. Exports `CSS_ANALYZER_DESCRIPTOR`.
- [doxAnalyzer.ts](./doxAnalyzer.ts): Validates project-wide `AGENTS.md` hierarchy, links, and documentation integrity. Exports `DOX_ANALYZER_DESCRIPTOR`.
