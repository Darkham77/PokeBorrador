# Purpose

Manage the logic and assets of admin.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Local Debug Panel Modularization (`LocalDebugPanel.vue`, `LocalDebugTabContent.vue`)**: Category tab switching and content rendering in `LocalDebugPanel.vue` is delegated to `LocalDebugTabContent.vue` to maintain low cyclomatic and cognitive complexity in the root debug tool.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
