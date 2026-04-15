# Final Hybrid UI Stabilization Plan

Este plan detalla los pasos finales para estabilizar la interfaz de Poké Vicio, asegurando que el zoom no rompa el HUD y que todos los sistemas legacy (Biblioteca, Bando, Centro Pokémon) funcionen perfectamente.

## User Review Required

> [!IMPORTANT]
> El sistema de zoom ahora se aislará en el contenedor `#zoomable-content`. El HUD superior y la barra de navegación inferior quedarán **fijos** en escala 1:1, asegurando legibilidad total independientemente del zoom del juego.

> [!WARNING]
> Se consolidarán los IDs duplicados. El segundo `#pokedex-modal` será removido para evitar conflictos con los scripts legacy.

## Proposed Changes

### Hybrid Interface (Vue)

#### [MODIFY] [LegacyInterface.vue](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/LegacyInterface.vue)
- **Aislamiento de Zoom**: Envolver las pestañas (`tab-map`, `tab-team`, etc.) y la pantalla de batalla en el contenedor `#zoomable-content`.
- **Eliminar Duplicados**: Quitar el `#pokedex-modal` redundante (línea 963).
- **Restaurar Overlays**: Asegurar que `#pokemon-center-overlay`, `#bag-overlay` y `#faction-choice-modal` estén dentro de la zona de zoom pero configurados correctamente.
- **Sincronización**: En el hook `onMounted`, disparar `initZoom()` y `updateHud()` para que la UI legacy se sincronice con el estado de Vue al instante.

### Scripts Legacy (JS)

#### [MODIFY] [07_battle.js](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/public/js/07_battle.js)
- Aplicar comprobaciones `null` en `updateBattleUI` para evitar el crash de `textContent`. (Ya realizado, verificar).

#### [MODIFY] [08_shop.js](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/public/js/08_shop.js)
- Asegurar que `openPokemonCenter` no colapse si el overlay no está en el DOM. (Ya realizado, verificar).

## Open Questions

- **Biblioteca**: ¿Ves algún error específico en la consola cuando intentas entrar a "Mi Biblioteca"? Investigaré si falta algún script por inicializar.

## Verification Plan

### Automated/Manual Tests
- Verificar zoom 50%, 100%, 150%: El HUD no debe cambiar de tamaño.
- Entrar en combate: La pantalla no debe quedar en negro.
- Curar en el Centro Pokémon: El overlay debe aparecer y desaparecer correctamente.
