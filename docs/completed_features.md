# Menús y Herramientas Finalizadas

Este documento sirve como referencia de los componentes, menús y herramientas que ya han sido migrados o actualizados a los estándares de producción de Poké Vicio. Deben usarse como guía para futuras implementaciones o actualizaciones de componentes legacy.

## Lista de Referencia

| Menú / Herramienta | Estado | Clases / Módulos de Referencia |
| :--- | :--- | :--- |
| **MAPA** | Finalizado | `MapCard.vue`, `MapGrid.vue`, `map.ts` (Store) |
| **POKEMON -> EQUIPO** | Finalizado | `TeamList.vue`, `PokemonSelectionModal.vue`, `game.ts` (Store) |
| **POKEMON -> POKEDEX** | Finalizado | `PokedexControls.vue`, `UnifiedPokemonDetailModal.vue`, `game.ts` (Store) |
| **POKEMON -> CAJA PC** | Finalizado | `BoxView.vue`, `BoxGrid.vue`, `BoxFilters.vue`, `BoxTabs.vue`, `_box.scss` |
| **HUDS** | Finalizado | `HUD_Navigation.vue`, `_hud.scss` |
| **MODALS** | Finalizado | `BaseModal.vue`, `_modals.scss`, `modals.ts` (Store) |
| **TOOLTIPS** | Finalizado | `PVTooltip.vue`, `_tooltips.scss`, `ui.ts` (Store) |
| **BIBLIOTECA** | Finalizado | `LibraryModal.vue`, `library.ts` (Store) |
| **CHAT** | Finalizado | `GlobalChat.vue`, `SocialCenterModal.vue`, `chat.ts` (Store) |
| **DEBUG** | Finalizado | `LocalDebugPanel.vue`, `debug.ts` (Store) |
| **AJUSTES** | Finalizado | `SettingsModal.vue`, `ui.ts` (Store) |
| **PERFIL** | Finalizado | `ProfileModal.vue`, `trainer.ts` (Store) |
| **CAMBIO DE BANDO** | Finalizado | `ClassSelectionModal.vue`, `FactionChoiceModal.vue`, `playerClass.ts` (Store) |
| **BUSCADOR DE POKEMON** | Finalizado | `PokemonSelectionModal.vue`, `BoxFilters.vue`, `ui.ts` (Store) |
| **VISOR DE DETALLES** | Finalizado | `UnifiedPokemonDetailModal.vue`, `pokemonDataProvider.ts` |
| **MOCHILA** | Finalizado | `InventoryModal.vue`, `InventorySidebar.vue`, `InventoryItemCard.vue`, `inventory.ts` (Store), `_inventory.scss` |
| **POKÉ MARKET** | Finalizado | `ShopModal.vue`, `ShopSidebar.vue`, `ShopItemCard.vue`, `shop.ts` (Store), `_shop.scss` |
| **MOTOR DE CLIMA** | Finalizado | `weatherUtils.ts`, `weather-tables.ts`, `timeUtils.ts`, `map.ts` (Store) |
| **GIMNASIOS** | Finalizado | `GymsView.vue`, `GymCard.vue`, `gyms.ts` (Store) |

## Reglas y Documentación Técnica

| Documento | Estado | Descripción Técnica |
| :--- | :--- | :--- |
| **Arquitectura** | Reconstruido | Estructura Vue 3, Pinia y Supabase. |
| **Captura** | Reconstruido | Fórmulas de ratio, sacudidas y multiplicadores de bolas. |
| **Evoluciones** | Reconstruido | Triggers de nivel, piedras e intercambio. |
| **Nivel Entrenador** | Reconstruido | Rangos, títulos y desbloqueos del Market. |
| **PvP y Social** | Reconstruido | Turnos simultáneos, ELO, Amigos e Intercambios. |
| **Balance** | Reconstruido | Ratios de Shiny, encuentros y objetos. |
| **Combate** | Verificado | Motor de daño, stages y estados alterados. |
| **Crianza/Huevos** | Verificado | Herencia genética y pasos de eclosión. |

## Uso como Guía de Migración

Cuando se trabaje en un nuevo componente o se migre uno legacy:

1. **Inspiración**: Revisa el código de los componentes arriba mencionados para entender cómo aplicar el estilo "Retro-Moderno".
2. **Reuso**: Antes de crear lógica nueva, verifica si los módulos de referencia ya ofrecen una solución genérica (ej. `BaseModal`, `PVTooltip`).
3. **Estructura**: Sigue el patrón de composición y uso de stores (Pinia) demostrado en estos módulos.
