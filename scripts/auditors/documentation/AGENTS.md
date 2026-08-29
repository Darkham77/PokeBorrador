# scripts/auditors/documentation/AGENTS.md

## Purpose & Scope

This directory contains documentation validation tools verifying Markdown cross-references, DOX hierarchy, and AGENTS.md links.

## Directory Structure & Files

- [validate_markdown_links.ts](./validate_markdown_links.ts): Scans all Markdown and AGENTS.md files for broken relative links and references.

## Local Governance & Rules

- Links must always use relative paths and valid anchor hashes.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
