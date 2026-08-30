# scripts/auditors/architecture/AGENTS.md

## Purpose & Scope

This directory contains static code analysis, AST governance, TypeScript configuration validation, and architectural health auditors.

## Directory Structure & Files

- [audit_project.ts](./audit_project.ts): Master static code, line limit, duplicate constants, CSS check, and Fallow AST analyzer.
- [validate_build_tools.ts](./validate_build_tools.ts): Validates bundling, transpilation, and build tools integrity.
- [validate_component_styles.ts](./validate_component_styles.ts): Audits Vue component style linkage, broken style links, and orphaned SCSS files.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution (JSON for orchestration, Box-Drawing for CLI).
- Zero error suppression: violations must be reported with explicit file and line context.
