# scripts/auditors/architecture/AGENTS.md

## Purpose & Scope

This directory contains static code analysis, AST governance, TypeScript configuration validation, and architectural health auditors.

## Directory Structure & Files

- [report_audit_warnings.ts](./report_audit_warnings.ts): Consolidated CLI reporter for audit warnings and errors (`npm run audit:warnings`, `npm run audit:summary`).
- [report_complexity.ts](./report_complexity.ts): Fallow cyclomatic and cognitive complexity hotspot reporter (`npm run audit:complexity`, `npm run audit:complexity:top`).
- [report_fallow.ts](./report_fallow.ts): Fallow codebase intelligence triage reporter (`npm run audit:fallow`).
- [validate_build_tools.ts](./validate_build_tools.ts): Validates bundling, transpilation, and build tools integrity.
- [validate_component_styles.ts](./validate_component_styles.ts): Audits Vue component style linkage, broken style links, and orphaned SCSS files.
- [validate_emoji_typography.ts](./validate_emoji_typography.ts): Audits Vue templates for unwrapped emojis and enforces proper icon/emoji class styling and vertical centering.
- [validate_audit_headers.ts](./validate_audit_headers.ts): Audits codebase for illegal file-level suppression directives (`fallow-ignore-file`, `/* eslint-disable */`, `@ts-nocheck`, `@ts-ignore`, and header escape hatches).
- [validate_native_paths.ts](./validate_native_paths.ts): Audits codebase for unsafe path concatenations, unsanitized environment/argv filesystem sinks (CWE-22), untrusted URL fetching (CWE-918 SSRF), and platform-incompatible path operations.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution (JSON for orchestration, Box-Drawing for CLI).
- Zero error suppression: violations must be reported with explicit file and line context.
- **Cross-Platform Path Governance**: All auditor scripts traversing repository files must use standardized path helpers (`toPosix`, `safeRelativePath`) to guarantee deterministic execution across Windows (PowerShell/CMD) and POSIX (Linux/macOS) environments under Node.js permission model.
