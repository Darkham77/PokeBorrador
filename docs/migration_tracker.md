# Legacy-to-Vue Migration Tracker

This document tracks the progress of migrating legacy JavaScript/CSS/HTML code from the `backup_legacy_code/` archive into the modern Vue 3 + Phaser architecture.

## Migration Status Table

| Original File (Legacy) | Vue Module / Composable | Status / Coverage | Notes |
| :--- | :--- | :--- | :--- |
| `public/js/01_auth.js` | `src/logic/auth/` | 100% | Migración completa: DBRouter, Registro, Unicidad de Sesión y Carga Fusionada Cloud/Local. |
| `public/js/04_state.js` | `src/stores/game.js` | 100% | Migrado chooseStarter y lógica de guardado inicial a Pinia. |
| `public/js/07_battle.js` | `src/logic/battle/` | 100% | Modularized into actions/abilities with functional parity. |
| `public/js/21_events.js` | `src/components/admin/EventAdminPanel.vue` | 100% | Migrated Ranked Rules Admin and Season Closure logic. |
| `public/js/02_pokemon_data.js` | `src/logic/data/` | 100% | Normalized and moved to optimized pseudo-DB. |
| `inventory.js` | `src/stores/inventoryStore.js` | 100% | Moved to Pinia store. |
| `public/login_guard.js` | `src/logic/auth/loginGuard.js` | 100% | Migrated to ESM; integrated with existing login flow. |
| `public/assets/` | `src/assets/` | 100% | Migrated to Vite-managed assets. All images converted to WebP. |
| `public/js/` (Legacy Dir) | `backup_legacy_code/js/` | 100% | Monolith removed from public/. |
| `00_time.js` | `src/logic/timeUtils.js` | 100% | Sincronizado vía RPC de servidor. |
| `06_encounters_v5.js` | `src/stores/map.js` | 100% | Motor de navegación y huevos 100% nativo. |
| `13_evolution.js` | `src/stores/evolutionStore.js` | 100% | Migrated to EvolutionStore, EvolutionScene.vue and StonePicker.vue. |
| `20_classes.js` | `src/stores/playerClassStore.js` | 100% | Migrated to PlayerClassStore, useClassModifiers and Vue components. |
| `09_social.js` | `src/stores/social.js` | 100% | Hub Social Modular, Presence y Rankings Globales (ELO, Nivel, Medallas). |
| `10_trade.js` | `src/stores/trade.js` | 100% | Intercambios Real-time con notificaciones de ofertas entrantes. |
| `16_chat.js` | `src/stores/chat.js` | 100% | Chat Global y Privado persistente en save_data. |
| `23_market.js` | `src/stores/gtsStore.js` | 100% | GTS Modular con visual parity 1:1 y tiempo real. |
| `market.js` (NPC) | `src/stores/shopStore.js` | 100% | Tienda NPC modernizada y separada del GTS. |
| `15_breeding.js` | `src/logic/breeding/` | 100% | Motor Genético v2 + Vigor + Egg Moves + Masuda. |
| `18_pokedex.js` | `src/stores/pokedex.js` | 100% | Recompensas por captura + Visualizador Stats (vía social updates). |
| `14_pvp.js` | `src/stores/pvpStore.js` | 100% | Real-time PvP Battles, Invite System, and Turn Resolution. |
| `24_passive_pvp.js` | `src/stores/rankedStore.js` | 100% | Seasonal Rules, ELO Tiers, Leaderboards, and Passive Defense. |
| `gyms.js` | `src/stores/gyms.js` | 100% | Desafío a Líderes nativo, registro de medallas y entrega de MTs. |
| `17_sounds.js` | `src/stores/audio.js` | 100% | Motor de síntesis 8-bit nativo Web Audio API (window.SFX eliminado). |
| `03_sprites.js` | `src/data/spriteMapping.js` | 100% | Mapeo de sprites PokeAPI desacoplado del motor legacy. |
| `27_cosmetics.js` | `src/data/cosmeticsData.js` | 100% | Datos de personalización (Nicks/Bordes) migrados a ESM. |
| `21_dominance.js` | `src/stores/war.js` | 100% | Guerra de Facciones, control de mapas, bonos de dominancia y guardianes. |
| `22_library.js` | `src/stores/library.js` | 100% | Sistema de ayuda y tutoriales (Biblioteca) con visual parity. |
| `19_error_handler.js` | `src/logic/errorHandler.js` | 100% | Captura de errores global y overlay de reporte de bugs. |
| `00_ratios.js` | `src/data/constants.js` | 100% | Constantes de juego y ratios de captura/batalla. |
| `10_trade_enhanced.js` | `src/components/social/TradePokemonSelector.vue` | 100% | Selector avanzado de Pokémon para intercambios con filtros. |
| `08_shop.js` | `src/data/items.js` | 90% | Datos de items migrados. Lógica de subida de rango pendiente. |

## Legend

- **100%**: All logic, styles, and assets migrated, verified, and unit tested.
- **In Progress**: Migration started but lacking functional parity and/or tests.
- **Missing**: Not yet analyzed or migration not started.

> [!IMPORTANT]
> Always update this table after completing a migration task. Refer to the `@/migrator-legacy-vue` skill for full standards compliance.
