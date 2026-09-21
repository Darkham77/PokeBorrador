# scripts/auditors/architecture/AGENTS.md

## Purpose & Scope

This directory contains static code analysis, AST governance, TypeScript configuration validation, and architectural health auditors.

## Directory Structure & Files

- [audit_project.ts](./audit_project.ts): Master code architecture and style rules auditor for 43 static rules across project files.
- [report_audit_findings.ts](./report_audit_findings.ts): Consolidated CLI reporter for audit findings, warnings, and errors (`npm run audit:findings`, `npm run audit:errors`, `npm run audit:warnings`, `npm run audit:summary`).
- [report_complexity.ts](./report_complexity.ts): Fallow cyclomatic and cognitive complexity hotspot reporter (`npm run audit:complexity`, `npm run audit:complexity:top`).
- [report_fallow.ts](./report_fallow.ts): Fallow codebase intelligence triage reporter (`npm run audit:fallow`).
- [validate_audit_headers.ts](./validate_audit_headers.ts): Audits codebase for illegal file-level suppression directives (`fallow-ignore-file`, `/* eslint-disable */`, `@ts-nocheck`, `@ts-ignore`, and unapproved or deprecated escape hatches such as `alias-ok`).
- [validate_battle_ui_branching.ts](./validate_battle_ui_branching.ts): Audits battle UI components to prevent bifurcated combat screens and enforce canonical arena reuse.
- [validate_build_tools.ts](./validate_build_tools.ts): Validates bundling, transpilation, and build tools integrity.
- [validate_bundle_budget.ts](./validate_bundle_budget.ts): Audits production bundle size budgets and enforces client decoupling.
- [validate_client_sim_decoupling.ts](./validate_client_sim_decoupling.ts): Audits client-side source files in `src/` (excluding Web Workers) for illegal runtime value imports from `@pkmn/sim` and `@pkmn/randoms`, enforcing complete simulation decoupling, 100% hard ERRORS only, and zero bypass/ignore escape hatches.
- [validate_component_styles.ts](./validate_component_styles.ts): Audits Vue component style linkage, broken style links, and orphaned SCSS files.
- [validate_console_cleanliness.ts](./validate_console_cleanliness.ts): Audits codebase for unauthorized `console.log` or debug statements in production paths.
- [validate_css_duplicates.ts](./validate_css_duplicates.ts): Audits SCSS stylesheets and Vue component styles using `css-checker` to detect duplicate CSS classes and selector definitions.
- [validate_dead_css.ts](./validate_dead_css.ts): Detects orphaned CSS/SCSS classes and unreferenced stylesheets.
- [validate_duplicate_constants.ts](./validate_duplicate_constants.ts): AST analysis via `SharedAstContext` (`requiresAst: true`) detecting duplicated constant values across modules.
- [validate_emoji_typography.ts](./validate_emoji_typography.ts): Audits Vue templates for unwrapped emojis and enforces proper icon/emoji class styling and vertical centering.
- [validate_error_suppression.ts](./validate_error_suppression.ts): Audits codebase for empty catch blocks, silent promise rejections, or swallowed errors.
- [validate_eslint.ts](./validate_eslint.ts): Wraps ESLint with cache and JSON output to enforce code style, syntax rules, and Zero-Warning Policy (elevating all warnings and errors to `severity: 'error'`), supporting `--fix`.
- [validate_fallow_config.ts](./validate_fallow_config.ts): Audits `.fallowrc.json` for integrity, bans dead-code suppressing entry globs, and ensures 100% of files and symbols declared in `ignoreExports` exist in code.
- [validate_mobile_accessibility.ts](./validate_mobile_accessibility.ts): Audits UI components for touch target sizing, viewport responsiveness, and mobile accessibility contracts.
- [validate_native_paths.ts](./validate_native_paths.ts): Audits codebase for unsafe path concatenations, unsanitized environment/argv filesystem sinks (CWE-22), untrusted URL fetching (CWE-918 SSRF), and platform-incompatible path operations.
- [validate_pinia_reactivity.ts](./validate_pinia_reactivity.ts): Audits Pinia stores for reactivity de-structuring and unwrapped state accesses.
- [validate_reactive_leaks.ts](./validate_reactive_leaks.ts): Audits Vue components and composables for uncleaned reactive subscriptions and listener leaks.
- [validate_reactive_purity.ts](./validate_reactive_purity.ts): Audits store mutations and getters to maintain reactive purity and prevent side-effects.
- [validate_render_performance.ts](./validate_render_performance.ts): Audits Vue SFC styles and SCSS files for render performance anti-patterns: bans mix-blend-mode in weather/animated layers, bans heavy filters (drop-shadow, blur) in weather overlays, clamps atmospheric insets to max 128px, and bans per-frame GSAP CPU modifiers in favor of native GPU fromTo loops.
- [validate_template_ids.ts](./validate_template_ids.ts): Audits Vue templates to enforce unique, deterministic DOM element IDs for automated testing.
- [validate_test_fragmentation.ts](./validate_test_fragmentation.ts): Audits test files in `tests/` to prevent proliferation of micro-files (<60 lines), enforce domain-cohesive test suites (300-800 lines), detect unnecessary JSDOM declarations (`unnecessary-jsdom` with `// jsdom-ok:` validation), and report test size distribution metrics (`npm run validate:test-fragmentation:summary`).
- [validate_test_hygiene.ts](./validate_test_hygiene.ts): Audits test suites for tautological assertions, excessive mocking, and test hygiene standards.
- [validate_type_check.ts](./validate_type_check.ts): Wraps `vue-tsc --noEmit` to validate TypeScript compilation and Vue SFC types under the Unified Auditor Framework, mapping compiler diagnostics to `StandardAuditResult` errors.
- [validate_typography_line_height.ts](./validate_typography_line_height.ts): Audits Vue SFC styles and SCSS files for vertical text spacing: flags dangerous `line-height: 1` or `0` on multiline text containers, and audits `overflow: hidden` text truncation for descender clipping risk (`typography-descender-clipping`), enforcing `line-height >= 1.4` and bottom padding buffers.
- [validate_vue_sfc_hygiene.ts](./validate_vue_sfc_hygiene.ts): Audits Vue Single File Components for `<script setup>`, style scoping, and SFC hygiene.
- [validate_z_index.ts](./validate_z_index.ts): Audits 1:1 parity between `Z_LAYERS` in TypeScript and `--z-*` CSS variables in `_base.scss`, supporting `--fix`.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution (JSON for orchestration, Box-Drawing for CLI).
- Zero error suppression: violations must be reported with explicit file and line context.
- **Fallow Configuration Hygiene Mandate**: The `.fallowrc.json` configuration must remain 100% synchronized with the actual codebase. All files and exported symbols declared under `ignoreExports` MUST exist on disk. Blanket entry globs (e.g. `src/components/**` or `src/views/**`) are strictly banned to prevent dead code suppression. Validated continuously by `validate_fallow_config.ts`.
- **Cross-Platform Path Governance**: All auditor scripts traversing repository files must use standardized path helpers (`toPosix`, `safeRelativePath`) to guarantee deterministic execution across Windows (PowerShell/CMD) and POSIX (Linux/macOS) environments under Node.js permission model.
- **Mandatory Showdown Decoupling & Zero-Ignore Governance**: Client application code must remain strictly decoupled from `@pkmn/sim` and `@pkmn/randoms`. The auditor `validate_client_sim_decoupling.ts` enforces this with 100% hard errors (exit code 1) and absolutely zero ignore directives or bypass tokens (`// sim-ok` is strictly forbidden).
- **Render Performance Auditor Governance (`validate_render_performance.ts`)**: Enforces 60 FPS GPU rendering across all atmospheric, weather, and animated layers. Zero `mix-blend-mode` in precipitation layers (prevents Chromium framebuffer readbacks), zero Gaussian convolution filters in repetitive flashes (replaces drop-shadow with concentric SVG strokes), clamped atmospheric insets (<= 128px to eliminate fragment fill-rate overdraw), and pure GPU `fromTo` loops (banning per-frame JS modifier closures).
- **SFC Block AST Comment-Stripping Hygiene Mandate**: Auditors evaluating block content or body length in Vue Single File Components (such as `<style>`, `<script>`, or `<template>` in `validate_component_styles.ts`) MUST strip all single-line (`// ...`) and multi-line (`/* ... */`) comments prior to trimming and length/structure evaluation. Evaluating raw body length without comment stripping creates a bypass vulnerability where comment-only blocks are treated as populated code, evading mandatory `@use "@/styles/..."` imports and style linkage rules.
- **AST Sub-Auditor Architecture Parity**: Architecture sub-auditors performing AST inspection (`validate_duplicate_constants`, `validate_pinia_reactivity`, `validate_reactive_leaks`, `validate_client_sim_decoupling`) MUST declare `requiresAst: true`, be registered in `AST_DEPENDENT_SUITE_IDS` within `scripts/maintenance/auditScanner.ts`, and consume `SharedAstContext` without standalone re-parsing.

