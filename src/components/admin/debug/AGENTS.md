# Purpose

Admin debugger panel tabs and developer console tools.

## Ownership

Backend and Systems Developers.

## Local Contracts

- Files here execute administrative queries, override game states, and trigger debugging events via browser windows.
- All code must execute safely and must not impact production performance.
- **Contextual Debug Segregation**: Battle-specific tools (e.g., combat animations, live sprite effects, combat audio) must be restricted to in-combat debug tools (`BattleDebugTools.vue`) and excluded from overworld panels (`LocalDebugPanel.vue`).
- **Debug Legality Guard & Modal Blocking**: Admin and debug creation panels (`DebugPokemonCreator.vue`, `DebugTrainersTab.vue`) MUST validate complete Pokémon legality (`checkPokemonLegality` / `validatePokemonLegality`) before executing actions (creation, encounter, catching, or starting simulated combat). If any Pokémon or move is illegal for its species/level, action execution MUST be blocked loudly by displaying the reusable `DebugIllegalModal.vue` explaining all reasons.
- **Debug Trainer Tab Modularization (`DebugTrainerGenSettings.vue`, `DebugTrainerMetaCard.vue`, `DebugTrainerBattleLauncher.vue`)**: The trainer combat testing tab (`DebugTrainersTab.vue`) decomposes generation parameters, trainer identity/criminality controls, and battle encounter launchers into dedicated child SFCs to keep cyclomatic and cognitive complexity minimal.
- **100% Playable Weather Debug Parity Mandate (`debugConstants.ts`)**: `DEBUG_WEATHER_EFFECTS` MUST maintain complete 1:1 parity with all 19 playable weathers registered in `WEATHER_REGISTRY` (including `cold`, `coldwave`, and `mist`). Both Map Admin and Battle Debug HUD share `TimeDebugControls.vue` as the Single Source of Truth; omitting or suppressing valid playable weathers from `DEBUG_WEATHER_EFFECTS` is strictly prohibited.

## Child DOX Index

- [shared/](./shared/AGENTS.md): Domain module documentation for shared.
