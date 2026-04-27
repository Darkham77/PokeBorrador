# Menús y Herramientas Finalizadas

Este documento sirve como referencia de los componentes, menús y herramientas que ya han sido migrados o actualizados a los estándares de producción de Poké Vicio. Deben usarse como guía para futuras implementaciones o actualizaciones de componentes legacy.

## Lista de Referencia

| Menú / Herramienta | Estado | Clases / Módulos de Referencia |
| :--- | :--- | :--- |
| **MAPA** | Finalizado | `MapCard.vue`, `MapGrid.vue`, `map.js` (Store) |
| **POKEMON -> EQUIPO** | Finalizado | `TeamList.vue`, `PokemonSelectionModal.vue`, `game.js` (Store) |
| **POKEMON -> POKEDEX** | Finalizado | `PokedexControls.vue`, `UnifiedPokemonDetailModal.vue`, `game.js` (Store) |
| **POKEMON -> CAJA PC** | Finalizado | `BoxView.vue`, `BoxGrid.vue`, `BoxFilters.vue`, `BoxTabs.vue`, `_box.scss` |
| **HUDS** | Finalizado | `HUD_Navigation.vue`, `_hud.scss` |
| **MODALS** | Finalizado | `BaseModal.vue`, `_modals.scss`, `modals.js` (Store) |
| **TOOLTIPS** | Finalizado | `PVTooltip.vue`, `_tooltips.scss`, `ui.js` (Store) |
| **BIBLIOTECA** | Finalizado | `LibraryModal.vue`, `library.js` (Store) |
| **CHAT** | Finalizado | `GlobalChat.vue`, `SocialCenterModal.vue`, `chat.js` (Store) |
| **DEBUG** | Finalizado | `LocalDebugPanel.vue`, `debug.js` (Store) |
| **AJUSTES** | Finalizado | `SettingsModal.vue`, `ui.js` (Store) |
| **PERFIL** | Finalizado | `ProfileModal.vue`, `trainer.js` (Store) |
| **CAMBIO DE BANDO** | Finalizado | `ClassSelectionModal.vue`, `FactionChoiceModal.vue`, `playerClass.js` (Store) |
| **BUSCADOR DE POKEMON** | Finalizado | `PokemonSelectionModal.vue`, `BoxFilters.vue`, `ui.js` (Store) |
| **VISOR DE DETALLES** | Finalizado | `UnifiedPokemonDetailModal.vue`, `pokemonDataProvider.js` |
| **MOCHILA** | Finalizado | `InventoryModal.vue`, `InventorySidebar.vue`, `InventoryItemCard.vue`, `inventory.js` (Store), `_inventory.scss` |
| **MOTOR DE CLIMA** | Finalizado | `weatherUtils.js`, `weather-tables.js`, `timeUtils.js`, `map.js` (Store) |

## Uso como Guía de Migración

Cuando se trabaje en un nuevo componente o se migre uno legacy:

1. **Inspiración**: Revisa el código de los componentes arriba mencionados para entender cómo aplicar el estilo "Retro-Moderno".
2. **Reuso**: Antes de crear lógica nueva, verifica si los módulos de referencia ya ofrecen una solución genérica (ej. `BaseModal`, `PVTooltip`).
3. **Estructura**: Sigue el patrón de composición y uso de stores (Pinia) demostrado en estos módulos.
