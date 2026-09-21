# scripts/auditors/documentation/AGENTS.md

## Purpose & Scope

This directory contains documentation validation tools verifying Markdown cross-references, DOX hierarchy, and AGENTS.md links.

## Directory Structure & Files

- [validate_markdown_links.ts](./validate_markdown_links.ts): Scans all Markdown and AGENTS.md files for broken relative links and references.
- [validate_markdown_lint.ts](./validate_markdown_lint.ts): Wraps `markdownlint-cli` to validate Markdown formatting, spacing, and style across documentation and skills with Zero-Warning Policy (elevating all issues to `severity: 'error'`), supporting `--fix`.
- [validate_markdown_syntax.ts](./validate_markdown_syntax.ts): Validates markdown syntax, heading hierarchies, code fence languages, and table formatting.

## Local Governance & Rules

- Links must always use relative paths and valid anchor hashes.
- **`markdown-absolute-path`**: Markdown files across the workspace must not contain absolute OS filesystem paths (e.g. `file:///`, `C:/Users/...`, or `/home/...`).
- **`markdown-stale-environment-path`**: Markdown files must not contain environment-specific directory tokens (`PokeBorrador`, developer profile usernames). All documentation links and mentions must remain strictly portable.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
