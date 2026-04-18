# Legacy-to-Vue Migration Tracker

This document tracks the progress of migrating legacy JavaScript/CSS/HTML code from the `backup_legacy_code/` archive into the modern Vue 3 + Phaser architecture.

## Migration Status Table

| Original File (Legacy) | Vue Module / Composable | Status / Coverage | Notes |
| :--- | :--- | :--- | :--- |
| `public/js/01_auth.js` | `src/logic/auth/` | 100% | Migración completa: DBRouter, Registro, Unicidad de Sesión y Carga Fusionada Cloud/Local. |
| `public/js/04_state.js` | `src/stores/game.js` | 100% | Migrado chooseStarter y lógica de guardado inicial a Pinia. |
| `public/js/07_battle.js` | `src/logic/battle/` | 100% | Modularized into actions/abilities with functional parity. |
| `public/js/21_events.js` | `src/components/admin/EventAdminPanel.vue` | 100% | Migrated Ranked Rules Admin and Season Closure logic. |
| `public/js/02_pokemon_data.js`| `src/logic/data/` | 100% | Normalized and moved to optimized pseudo-DB. |
| `inventory.js` | `src/stores/inventoryStore.js` | 100% | Moved to Pinia store. |
| `public/login_guard.js` | `src/logic/auth/loginGuard.js` | 100% | Migrated to ESM; integrated with existing login flow. |
| `public/assets/` | `src/assets/` | 100% | Migrated to Vite-managed assets. All images converted to WebP. |
| `public/js/` (Legacy Dir) | `backup_legacy_code/js/` | 100% | Monolith removed from public/. |
| `00_time.js` | `src/logic/timeUtils.js` | 100% | Sincronizado vía RPC de servidor. |
| `06_encounters_v5.js` | `src/stores/map.js` | 100% | Motor de navegación y huevos 100% nativo. |
| `13_evolution.js` | `src/stores/evolutionStore.js` | 100% | Migrated to EvolutionStore, EvolutionScene.vue and StonePicker.vue. |
| `20_classes.js` | `src/stores/playerClassStore.js` | 100% | Migrated to PlayerClassStore, useClassModifiers and Vue components. |
| `09_social.js` | `src/stores/social.js` | 100% | Hub Social Modular, Presence y Rankings Globales. |
| `16_chat.js` | `src/stores/chat.js` | 100% | Chat Global y Privado persistente en save_data. |
| `23_market.js` | `src/stores/gtsStore.js` | 100% | GTS Modular con visual parity 1:1 y tiempo real. |
| `market.js` (NPC) | `src/stores/shopStore.js` | 100% | Tienda NPC modernizada y separada del GTS. |
| `15_breeding.js` | `src/logic/breeding/` | 100% | Motor Genético v2 + Vigor + Egg Moves + Masuda. |
| `18_pokedex.js` | `src/stores/pokedex.js` | 100% | Recompensas por captura + Visualizador Stats (vía social updates). |
| `14_pvp.js` | `src/stores/pvpStore.js` | 100% | Real-time PvP Battles, Invite System, and Turn Resolution. |
| `24_passive_pvp.js` | `src/stores/rankedStore.js` | 100% | Seasonal Rules, ELO Tiers, Leaderboards, and Passive Defense. |

## Legend

- **100%**: All logic, styles, and assets migrated, verified, and unit tested.
- **In Progress**: Migration started but lacking functional parity and/or tests.
- **Missing**: Not yet analyzed or migration not started.

> [!IMPORTANT]
> Always update this table after completing a migration task. Refer to the `@/migrator-legacy-vue` skill for full standards compliance.
