# Purpose

Workspace packages for Poké Vicio, hosting standalone reusable libraries and tools.

## Ownership

Architecture & DevOps Engineers.

## Local Contracts

- Every package is managed via NPM workspaces (`"workspaces": ["packages/*"]`).
- Packages must be domain-agnostic, independently typed, and zero-dependency on host business rules.

## Child DOX Index

- [auditor/AGENTS.md](./auditor/AGENTS.md): Standalone static analysis and architecture audit framework (`@fgp/auditor`).
