# Menús y Herramientas Finalizadas

Este documento sirve como referencia de los componentes, menús y herramientas que ya han sido migrados o actualizados a los estándares de producción de Poké Vicio. Deben usarse como guía para futuras implementaciones o actualizaciones de componentes legacy.

## Lista de Referencia

| Menú / Herramienta | Estado | Componentes / Módulos de Referencia |
| :--- | :--- | :--- |
| **MAPA** | Finalizado | `map/MapCard.vue`, `map/MapGrid.vue`, `map.ts` (Store) |
| **POKEMON -> EQUIPO** | Finalizado | `modals/TeamManagementModal.vue`, `modals/PokemonSelectionModal.vue`, `game.ts` (Store) |
| **POKEMON -> POKEDEX** | Finalizado | `pokedex/PokedexControls.vue`, `pokedex/PokedexPokemonCard.vue`, `modals/UnifiedPokemonDetailModal.vue`, `game.ts` (Store) |
| **POKEMON -> CAJA PC** | Finalizado | `BoxView.vue`, `box/BoxGrid.vue`, `box/BoxFilters.vue`, `box/BoxTabs.vue`, `_box.scss` |
| **HUDS** | Finalizado | `HUD_Navigation.vue`, `_hud.scss` |
| **MODALS** | Finalizado | `common/BaseModal.vue`, `_modals.scss`, `modals.ts` (Store) |
| **TOOLTIPS** | Finalizado | `common/PVTooltip.vue`, `_tooltips.scss`, `ui.ts` (Store) |
| **BIBLIOTECA** | Finalizado | `LibraryModal.vue`, `library.ts` (Store) |
| **CHAT Y SOCIAL** | Gran parte migrado (falta testing, falta PvP) | `social/GlobalChat.vue`, `social/SocialCenterModal.vue`, `social/SocialFriendsTab.vue`, `chat.ts` (Store), `social.ts` (Store) |
| **SOCIAL -> RANKING** | Finalizado | `modals/RankingModal.vue`, `sqliteEngine.ts`, `social.ts` (Store), `_pokemon.scss` |
| **DEBUG** | Finalizado | `admin/LocalDebugPanel.vue`, `debug.ts` (Store) |
| **AJUSTES** | Finalizado | `SettingsModal.vue`, `ui.ts` (Store) |
| **PERFIL** | Finalizado | `ProfileModal.vue`, `profile.ts` (Store), `game.ts` (Store) |
| **SELECCIÓN DE CLASE / BANDO** | Finalizado | `modals/ClassSelectionModal.vue`, `modals/ClassMissionsModal.vue`, `modals/class/ClassDashboard.vue`, `FactionChoiceModal.vue`, `playerClass.ts` (Store) |
| **BUSCADOR DE POKEMON** | Finalizado | `modals/PokemonSelectionModal.vue`, `box/BoxFilters.vue`, `ui.ts` (Store) |
| **VISOR DE DETALLES** | Finalizado | `modals/UnifiedPokemonDetailModal.vue`, `pokemonDataProvider.ts` |
| **MOCHILA** | Finalizado | `modals/InventoryModal.vue`, `modals/inventory/InventorySidebar.vue`, `modals/inventory/InventoryItemCard.vue`, `inventory.ts` (Store), `_inventory.scss` |
| **POKÉ MARKET** | Finalizado | `modals/ShopModal.vue`, `modals/shop/ShopSidebar.vue`, `modals/shop/ShopItemCard.vue`, `shop.ts` (Store), `_shop.scss` |
| **BC SHOP** | Finalizado | `modals/BCShopModal.vue`, `modals/bc-shop/BCShopSidebar.vue`, `modals/bc-shop/BCShopItemCard.vue`, `shop.ts` (Store), `_shop.scss` |
| **WAR SHOP / MARKET DE GUERRA** | Finalizado | `modals/war-shop/WarShopModal.vue`, `modals/war-shop/WarShopItemCard.vue`, `shop.ts` (Store), `_shop.scss` |
| **MOTOR DE CLIMA** | Finalizado | `weatherUtils.ts`, `weather-tables.ts`, `timeUtils.ts`, `map.ts` (Store) |
| **GIMNASIOS** | Finalizado | `GymsView.vue`, `GymCard.vue`, `gyms.ts` (Store) |
| **CRIANZA Y GUARDERÍA** | Finalizado | `modals/DaycareModal.vue`, `breeding/BreedingSummary.vue`, `breeding/DaycareSlot.vue`, `breeding/EggWarehouse.vue`, `breeding.ts` (Store) |
| **MISIONES DE EVENTO** | Finalizado | `modals/EventMissionsModal.vue`, `events/EventMissions.vue`, `breeding.ts` (Store) |
| **EVENTOS MUNDIALES** | Finalizado | `modals/WorldEventsModal.vue`, `events.ts` (Store) |
| **DOMINANCIA / GUERRA DE FACCIONES** | Finalizado | `modals/FactionWarModal.vue`, `war.ts` (Store) |

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

## Herramientas de Desarrollo y Calidad

| Herramienta | Estado | Propósito y Uso |
| :--- | :--- | :--- |
| **Auditoría de Assets** | Finalizado | Verifica la existencia física en disco de los sprites de todos los ítems por tienda: `node --experimental-strip-types scripts/audit_item_assets.ts` |
| **Descarga de Assets** | Finalizado | Automatiza la obtención de sprites faltantes desde PokeAPI: `node --experimental-strip-types scripts/download_missing_items.ts` |

## Uso como Guía de Migración

Cuando se trabaje en un nuevo componente o se migre uno legacy:

1. **Inspiración**: Revisa el código de los componentes arriba mencionados para entender cómo aplicar el estilo "Retro-Moderno".
2. **Reuso**: Antes de crear lógica nueva, verifica si los módulos de referencia ya ofrecen una solución genérica (ej. `BaseModal`, `PVTooltip`).
3. **Estructura**: Sigue el patrón de composición y uso de stores (Pinia) demostrado en estos módulos.
