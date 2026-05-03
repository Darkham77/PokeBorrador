# GUÍA DE RESTAURACIÓN DE HUD DE COMBATE (Vicio Edition)

Este directorio contiene la versión **Premium Retro-Modern** del HUD de combate. Sigue estos pasos para restaurarlo en cualquier rama, especialmente si has vuelto al commit `e5838b6d8636a7addf3fbbfd8af551dd12276ae7`.

## ⚠️ IMPORTANTE PARA LA IA
Si estás leyendo esto como un agente de IA, debes ejecutar los comandos de copiado **pisando** los archivos existentes. Esta versión está optimizada para la estabilidad del estado y la estética premium.

## Paso 1: Limpieza de Rama (Opcional)
Si acabas de hacer `git checkout e5838b6d8636a7addf3fbbfd8af551dd12276ae7`, asegúrate de que no haya conflictos pendientes.

## Paso 2: Restauración de Archivos (El Gran "Pise")
Ejecuta los siguientes comandos (o realiza la copia manual) para restaurar el ecosistema del HUD:

### Componentes
```powershell
Copy-Item "docs/HUD/components/*" "src/components/battle/" -Recurse -Force
Copy-Item "docs/HUD/components/box/BoxPokemonCard.vue" "src/components/box/BoxPokemonCard.vue" -Force
Copy-Item "docs/HUD/components/common/PVTooltip.vue" "src/components/common/PVTooltip.vue" -Force
```

### Lógica (Store & Composables)
```powershell
Copy-Item "docs/HUD/stores/battle.js" "src/stores/battle.js" -Force
Copy-Item "docs/HUD/composables/*" "src/composables/" -Force
```

### Estilos (SASS)
```powershell
Copy-Item "docs/HUD/styles/*" "src/styles/components/" -Force
```

## Paso 3: Verificación Técnica
1. **Regla de las 500 líneas:** Verifica que `battle.js` no exceda el límite (está cerca, pero modularizado).
2. **SASS Integrity:** Asegúrate de que los filtros sigan siendo capitalizados (e.g., `Blur()`, `Scale()`).
3. **Reactividad:** El HUD depende de `useBattleHud.js`. Si ves que la vida o los movimientos no se actualizan, revisa la conexión entre `BattleArenaControls.vue` y el store.

## Paso 4: Pruebas en Consola
Simula un combate para verificar que el HUD cargue correctamente:
```javascript
window.__VITE_DEBUG__.battle.store()._startBattle({ id: 1, name: 'Bulbasaur', level: 5, hp: 20, maxHp: 20, moves: [] })
```

---
*Generado por Antigravity - Ecosistema Poké Vicio*
