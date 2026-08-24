# Purpose

Admin debugger panel tabs and developer console tools.

## Ownership

Backend and Systems Developers.

## Local Contracts

- Files here execute administrative queries, override game states, and trigger debugging events via browser windows.
- All code must execute safely and must not impact production performance.
- **Contextual Debug Segregation**: Battle-specific tools (e.g., combat animations, live sprite effects, combat audio) must be restricted to in-combat debug tools (`BattleDebugTools.vue`) and excluded from overworld panels (`LocalDebugPanel.vue`).

## Child DOX Index

- [shared/](./shared/AGENTS.md): Domain module documentation for shared.
