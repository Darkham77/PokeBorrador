# Legacy-to-Vue Migration Tracker

This document tracks the progress of migrating legacy JavaScript/CSS/HTML code from the `backup_legacy_code/` archive into the modern Vue 3 + Phaser architecture.

## Migration Status Table

| Original File (Legacy) | Vue Module / Composable | Status / Coverage | Notes |
| :--- | :--- | :--- | :--- |
| `public/js/01_auth.js` | `src/logic/auth/` | 100% | Migración completa: DBRouter, Registro, Unicidad de Sesión y Carga Fusionada Cloud/Local. |
| `public/js/04_state.js` | `src/stores/game.js` | 100% | Migrado chooseStarter y lógica de guardado inicial a Pinia. |
| `public/js/07_battle.js` | `src/logic/battle/` | 100% | Modularized into actions/abilities with functional parity. |
| `public/js/21_events.js` | `src/components/admin/` | 100% | Modularizado en `EventAdminPanel`, `AdminEventTab` y `AdminRankedTab`. |
| `public/js/02_pokemon_data.js` | `src/logic/data/` | 100% | Normalized and moved to optimized pseudo-DB. |
| `inventory.js` | `src/stores/inventory.js` | 100% | Moved to Pinia store. |
| `public/login_guard.js` | `src/logic/auth/loginGuard.js` | 100% | Migrated to ESM; integrated with existing login flow. |
| `public/assets/` | `public/assets/` | 100% | Consolidación total. Eliminado `src/assets/`. WebP mandatorio con pipeline automatizado. |
| `public/js/` (Legacy Dir) | `backup_legacy_code/js/` | 100% | Monolith removed from public/. |
| `00_time.js` | `src/logic/timeUtils.js` | 100% | Sincronizado vía RPC de servidor. |
| `06_encounters_v5.js` | `src/stores/map.js` | 100% | Motor de navegación y huevos 100% nativo. |
| `13_evolution.js` | `src/stores/evolution.js` | 100% | Refactorizado a Composition API y unificado con EvolutionLogic. |
| `20_classes.js` | `src/stores/playerClass.js` | 100% | Migrated to PlayerClassStore, useClassModifiers and Vue components. |
| `09_social.js` | `src/stores/social.js` | 100% | Hub Social. `ProfileModal` modularizado en `ProfileBadges`, `ProfileStats` y `ProfileTeam`. |
| `10_trade.js` | `src/stores/trade.js` | 100% | Intercambios Real-time. UI modularizada en `TradeView` y `TradeSidePanel`. |
| `16_chat.js` | `src/stores/chat.js` | 100% | Chat Global y Privado persistente en save_data. |
| `23_market.js` | `src/stores/gts.js` | 100% | GTS Modular con visual parity 1:1, filtros Vue y tiempo real. `marketUI.js` eliminado. |
| `market.js` (NPC) | `src/stores/shop.js` | 100% | Tienda NPC modernizada, desacoplada de GTS y testeada al 100%. |
| `15_breeding.js` | `src/stores/breeding.js` | 100% | Motor Genético v2 + BreedingSummary.vue. `breedingUI.js` eliminado. |
| `18_pokedex.js` | `src/stores/pokedex.js` | 100% | Recompensas por captura + Visualizador Stats (vía social updates). |
| `14_pvp.js` | `src/stores/livePvP.js` | 100% | Real-time PvP Battles, Turn Resolution y Combat Engine testeado. |
| `24_passive_pvp.js` | `src/stores/passivePvp.js` | 100% | Seasonal Rules, ELO Tiers, Leaderboards y Defensa Pasiva. |
| `gyms.js` | `src/stores/gyms.js` | 100% | Desafío a Líderes nativo, registro de medallas y entrega de MTs. |
| `17_sounds.js` | `src/stores/audio.js` | 100% | Unificado con `audioEngine.js`, eliminando duplicación de síntesis. |
| `03_sprites.js` | `src/data/spriteMapping.js` | 100% | Mapeo de sprites PokeAPI desacoplado del motor legacy. |
| `27_cosmetics.js` | `src/components/modals/CosmeticsModal.vue` | 100% | Customización de Nick y Avatares integrada con cosmetics.js y Supabase. |
| `21_dominance.js` | `src/stores/war.js` | 100% | Guerra de Facciones, control de mapas, bonos de dominancia y guardianes. |
| `22_library.js` | `src/stores/library.js` | 100% | Sistema de ayuda y tutoriales (Biblioteca) con visual parity. |
| `19_error_handler.js` | `src/logic/errorHandler.js` | 100% | Captura de errores global y overlay de reporte de bugs. |
| `00_ratios.js` | `src/data/constants.js` | 100% | Constantes de juego y ratios de captura/batalla. |
| `10_trade_enhanced.js` | `src/components/social/TradePokemonSelector.vue` | 100% | Selector avanzado de Pokémon para intercambios con filtros. |
| `08_shop.js` | `src/data/items.js` & `src/stores/shop.js` | 100% | Datos de items migrados. Lógica de subida de rango por nivel de entrenador completada. |
| `05_render.js` | `src/phaser/scenes/` | 100% | Lógica de renderizado legacy migrada al motor Phaser 3 nativo. |
| `11_battle_ui.js` | `src/components/battle/` | 100% | Interfaz de batalla separada en componentes Vue modulares. |
| `12_box_bag.js` | `src/components/box/` & `src/stores/box.js` | 100% | Gestión de PC y Mochila migrada a Pinia y Vue. |
| `05_render.js (Buffs)` | `src/stores/buffs.js` | 100% | Lógica global de Timers y Panel Lateral de Buffs migrada y testeada. |
| `11_battle_ui.js (Fossils)`| `src/components/modals/FossilRevivalModal.vue` | 100% | Lógica de resurrección de fósiles de la mochila migrada a Vue. |
| `06_encounters_v5.js (Pesca)` | `src/components/battle/FishingMinigame.vue` | 100% | Minijuego de pesca rítmico migrado a Vue. `encounterUI.js` modernizado. |
| `missions.js` | `src/stores/playerClass.js` | 100% | Lógica de misiones de clase consolidada en el store. `missionUI.js` eliminado. |
| [UNIFICACIÓN] | `src/stores/game.js` | 100% | Centralización de `addPokemon`/`removePokemon`. Motor de fósiles movido a `src/logic/items/fossilEngine.js`. |
| [UNIFICACIÓN] | `src/logic/pokemonFactory.js`| 100% | Removidos hacks de `window`. Integración nativa con Stores. |

## Legend

- **100%**: All logic, styles, and assets migrated, verified, and unit tested.
- **In Progress**: Migration started but lacking functional parity and/or tests.
- **Missing**: Not yet analyzed or migration not started.

> [!IMPORTANT]
> Always update this table after completing a migration task. Refer to the `@/migrator-legacy-vue` skill for full standards compliance.
