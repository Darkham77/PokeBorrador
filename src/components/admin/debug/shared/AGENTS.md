# Purpose

Shared UI inputs, layout forms, and selectors used exclusively by dev debug tools.

## Ownership

Backend and Systems Developers.

## Local Contracts

- Provides basic inputs, sliders, and selection boxes for editing stats and attributes inside debug views.
- `TimeDebugControls.vue`: Shared UI and logic for time, season, and weather manipulation across Admin Panel and Battle Debug HUD. Datetime controls MUST initialize and synchronize inputs using local game time (`getGMT3Date().toPlainDateTime()`) rather than slicing UTC instant strings.
- `SpawnDebugControls.vue`: Shared UI and logic for configuring all spawn conditions, event rates, and minigames probabilities (Fishing, Mining/Archaeology, Shinies, Trainers, Rivals, Guardians) across Admin Panel and Battle Debug HUD.
- `DebugNumericControlRow.vue`: Generic modular component providing label with explanatory tooltip, numeric input, quick preset buttons, and a dedicated default button to restore individual settings.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
