# scripts/auditors/architecture/AGENTS.md

## Purpose & Scope

This directory contains static code analysis, AST governance, TypeScript configuration validation, and architectural health auditors.

## Directory Structure & Files

- [audit_project.ts](./audit_project.ts): Master static code, line limit, duplicate constants, CSS check, and Fallow AST analyzer. Supports dynamic selective rule execution via `RuleDescriptor` and short-circuits unrequested suites.
- [validate_build_tools.ts](./validate_build_tools.ts): Validates bundling, transpilation, and build tools integrity.
- [validate_component_styles.ts](./validate_component_styles.ts): Audits Vue component style linkage, broken style links, and orphaned SCSS files.
- [validate_emoji_typography.ts](./validate_emoji_typography.ts): Audits Vue templates for unwrapped emojis and enforces proper icon/emoji class styling and vertical centering.
- [validate_audit_headers.ts](./validate_audit_headers.ts): Audits codebase for illegal file-level suppression directives (`fallow-ignore-file`, `/* eslint-disable */`, `@ts-nocheck`, `@ts-ignore`, and header escape hatches).
- [validate_native_paths.ts](./validate_native_paths.ts): Audits codebase for unsafe path concatenations, unsanitized environment/argv filesystem sinks (CWE-22), untrusted URL fetching (CWE-918 SSRF), and platform-incompatible path operations.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution (JSON for orchestration, Box-Drawing for CLI).
- Zero error suppression: violations must be reported with explicit file and line context.
