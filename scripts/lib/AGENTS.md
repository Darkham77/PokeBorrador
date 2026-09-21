# scripts/lib

Core infrastructure libraries, base classes, streaming runners, and terminal rendering themes powering Poké Vicio's audit engine and CLI developer tooling.

## Ownership

Tooling / Platform Architecture Engineers.

## Directory Navigation Index

- [scripts/AGENTS.md](../AGENTS.md): Automation, build processes, diagnostic tools, and utility scripts.
- [scripts/auditors/AGENTS.md](../auditors/AGENTS.md): Domain sub-auditors and AST validation suites.

## Local Contracts

- **Core Auditor OOP Superclasses (`auditorBase.ts`)**: Defines `BaseAuditor<TRuleId>`, `FileScanAuditor<TRuleId>`, and `CompositeAuditor`. All sub-auditors in `scripts/auditors/` MUST inherit from these superclasses. Standalone procedural scripts or ad-hoc directory walkers are strictly forbidden.
- **Shared AST Engine & Cache Boundary (`astContext.ts`)**: Provides `SharedAstContext` for centralized, memoized TypeScript AST creation and caching across all sub-auditors. Eliminates duplicate file parsing across suites, supports Vue SFC script extraction with line offset preservation, and provides O(1) in-memory retrieval of pre-compiled `ts.SourceFile` objects.
- **Unified Theme & Box-Drawing Boundary (`unifiedTheme.ts`)**: Centralizes Unicode Box-Drawing terminal rendering, visual widths (`getVisualWidth`), and badge formatting (`[ ✅ PASS ]`, `[ ❌ FAIL ]`, `[ ⚠️ WARN ]`). Terminal tables MUST NOT exceed 80 columns in width, MUST prevent line wrapping across platforms, and MUST account for multi-byte Unicode and double-width emojis.
- **Audit Contract & Finding Shapes (`auditContract.ts`)**: SSoT data contracts for findings (`AuditFinding`), execution results (`StandardAuditResult`), and summary tallies (`AuditSummary`).
- **Parallel Streaming Runner (`streamingRunner.ts`)**: Provides dynamic sub-auditor execution with bounded CPU concurrency and real-time streaming output.
- **Native Path Standard Library & Zero Re-export Mandate (`safePath.ts`)**: Tooling and scripts MUST prioritize native Node.js standard modules (`node:path`, `node:fs`) directly. Utility files like `safePath.ts` provide security boundaries against path traversal and SSRF, but MUST NEVER re-export types or functions from `auditorBase.ts` or other internal modules. Passthrough re-exports and circular module couplings are strictly forbidden.
- **Lazy Third-Party Tooling in Base Classes (`auditorBase.ts`)**: Superclasses and base utilities that orchestrate execution MUST NOT eagerly import heavy compiler or external packages (such as `typescript`) at the module top level. Type declarations MUST use `import type`, and runtime engine modules (such as `SharedAstContext`) MUST be dynamically imported on demand (`await import('./astContext.ts')`) exclusively when an auditor explicitly enables that capability (`requiresAst: true`).
- **Zero Magic Numbers & Named Constants**: All numeric thresholds, terminal width limits (e.g. 80 columns), and timing constants declared in this directory MUST be named constants (`as const`).

## Work Guidance

- Refer to the dedicated skill [auditor-framework](../../.agents/skills/auditor-framework/SKILL.md) whenever maintaining or refactoring files in this directory.
- Never add game domain logic here; keep modules strictly decoupled, generic, and focused on CLI tooling and auditing infrastructure.

## Verification

- Run `npm run audit:md` to certify that this directory is properly indexed.
- Run `npm run test:node -- tests/node/auditors/` to verify auditor framework contracts.
