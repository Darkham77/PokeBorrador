# scripts/auditors/documentation/AGENTS.md

## Purpose & Scope

This directory contains documentation validation tools verifying Markdown cross-references, DOX hierarchy, and AGENTS.md links.

## Directory Structure & Files

- [validate_dox_integrity.ts](./validate_dox_integrity.ts): Scans all `AGENTS.md` documentation indices to verify hierarchy integrity, required sections, relative link validity, and gitignore target enforcement.
- [validate_markdown_code_references.ts](./validate_markdown_code_references.ts): Validates that inline source code paths, `npm run <cmd>` invocations, and runtime versions across documentation and skills are completely accurate and resolve to existing targets.
- [validate_markdown_links.ts](./validate_markdown_links.ts): Scans all Markdown and AGENTS.md files for broken relative links and references.
- [validate_markdown_lint.ts](./validate_markdown_lint.ts): Wraps `markdownlint-cli` to validate Markdown formatting, spacing, and style across documentation and skills with Zero-Warning Policy (elevating all issues to `severity: 'error'`), supporting `--fix`.
- [validate_markdown_syntax.ts](./validate_markdown_syntax.ts): Validates markdown syntax, heading hierarchies, code fence languages, and table formatting.

## Local Governance & Rules

- Links must always use relative paths and valid anchor hashes.
- **`markdown-absolute-path`**: Markdown files across the workspace must not contain absolute OS filesystem paths (e.g. `file:///`, `C:/Users/...`, or `/home/...`).
- **`markdown-stale-environment-path`**: Markdown files must not contain environment-specific directory tokens (`PokeBorrador`, developer profile usernames). All documentation links and mentions must remain strictly portable.
- **`cross-platform-path-normalization`**: Path normalizers in auditor scripts MUST use `rel.replace(/\\/g, '/')` instead of relying on host `path.sep` to guarantee deterministic Windows/Linux cross-platform behavior.
- **`linux-ext4-case-sensitivity`**: Markdown code references and AGENTS.md local contract declarations MUST be audited for exact casing against the physical disk via directory inspection (`fs.readdirSync`), preventing case mismatches on Linux ext4 filesystems.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
