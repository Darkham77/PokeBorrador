# Especificación Técnica: Pincel Reparador de Autotiling v2 (Model-First Autotile Healing Brush)

## 1. Propósito y Alcance

Este documento especifica la arquitectura **Model-First**, los invariantes topológicos 2D/2.5D y las garantías matemáticas de convergencia de Lyapunov del **Pincel Reparador de Autotiling v2** y del **Escáner Continental de Defectos** en el estudio regional de Poké Vicio ([`test_aventura/views/RegionalContinentStudioView.vue`](../views/RegionalContinentStudioView.vue)).

La herramienta opera en dos modalidades complementarias:

1. **Pincel Sanador Interactivo (`#btn-regional-healing-brush`)**: Al hacer clic o arrastrar sobre el lienzo con radio configurable, sanea las matrices semánticas subyacentes dentro de una ventana local con histéresis controlada y redibuja exclusivamente el rectángulo sucio mediante [`renderRegionalContinentDirtyRect`](../logic/map/canvasViewportBlitter.ts) (preservando el fondo oceánico `#0a1428` sin artefactos negros `#000000`), con soporte completo de **Deshacer / Rehacer** (`#btn-regional-undo`, `#btn-regional-redo`).
2. **Auto-Sanado Continental en 1 Clic (`#btn-regional-heal-all`)**: Ejecuta [`scanContinentAutotileDefects`](../logic/map/autotileDefectScanner.ts) sobre el continente completo y aplica [`healAllContinentDefects`](../logic/map/autotileHealingEngine.ts) hasta alcanzar **0 defectos residuales** verificados en los 4 dominios (`mountain`, `water`, `path`, `macro_biome`).

---

## 2. Estado del Arte y Principio Model-First

En los editores modernos de mapas basados en reglas (**LDtk IntGrid + Auto-Layers**, **Tiled Terrain Brush / Wang Sets**, **Godot 4 Terrain Connect** y **RPG Maker 47-tile Blob Autotiling**), un pincel reparador nunca sobrescribe sprites aislados en el framebuffer:

1. **Mutación de la Fuente de Verdad Semántica**: El pincel modifica únicamente las matrices discretas de dominio (`terrainMatrix`, `heightmap`, `pathGrid` y `macroBiomes.biomeGrid`).
2. **Clausura Morfológica y Recompilación Determinista**: Tras sanear las matrices, el motor recompila el autotiling geológico mediante `compileGeologicalAutotiling` (`resolveWaterAutotileGrid`, `resolveMountainAutotileGrid`, `resolveMacroBiomeAutotile` y `resolvePathGrid`).
3. **Convergencia Monótona de Lyapunov**: Toda regla de reparación disminuye estrictamente un potencial discreto acotado inferiormente (democión de elevación en `heightmap`, erosión de lóbulos de 1 celda en `macro_biome`, poda monótona tras relleno único de codos en `path`, y umbral de mayoría estricta $\ge 3$ cardinales en `water`/`sand`), impidiendo oscilaciones de ciclo 2.

---

## 3. Escáner Continental de Defectos (`autotileDefectScanner.ts`)

El módulo [`test_aventura/logic/map/autotileDefectScanner.ts`](../logic/map/autotileDefectScanner.ts) inspecciona cualquier `ContinentMapResult` junto con `pathGrid`, `bridgeGrid` y `pois`, clasificando 13 familias canónicas definidas en [`AUTOTILE_DEFECT_KINDS`](../types/map/autotileHealingTypes.ts):

### 3.1 Dominio Montaña 2.5D (`mountain`)

- `mountain_thin_ridge`: Crestas de 1 celda de grosor (`(!hasN && !hasS) || (!hasW && !hasE)`), escalones colgantes al sur de 1 columna (`(!hasW && !hasS && hasE && hasSE) || (!hasE && !hasS && hasW && hasSW)`), escalones frontales al sur de 1 fila que colisionan a media altura con la pared `projectedFoot` vecina (`(!hasW && !hasS && hasN && hasNW) || (!hasE && !hasS && hasN && hasNE)`), o picos aislados inválidos en cotas superiores (`elev > 1`).
- `mountain_diagonal_pinch`: Contacto diagonal en damero $2\times 2$ entre mesetas elevadas sin puente ortogonal.
- `mountain_steep_drop`: Salto cardinal mayor a 1 nivel de altura (`|elev(a) - elev(b)| > 1`), que rompería la pared vertical de 2 tiles GBA.
- `mountain_water_overlap`: Celda elevada (`elev > 0`) situada sobre terreno no herboso (`water`, `water_deep`, `sand`).
- `mountain_south_water_overhang`: Borde sur elevado cuya pared `projectedFoot` caería directamente sobre agua en $(x, y + 1)$.
- `mountain_invalid_stair`: Escalera desemparejada (`stairs_l` sin `stairs_r`) o sin rellano transitable en $(x, y + 1)$.

### 3.2 Dominio Agua y Costa (`water`)

- `water_sliver`: Lengua de agua o arena de 1 celda de espesor que exigiría bordes opuestos simultáneos en un conjunto de 13 tiles, o esquina interior perdida en curva S (`hasDropped2DInnerCorner`). Las celdas `'grass'` quedan excluidas de esta regla porque siempre resuelven a `poke_grass_plain.png`.
- `water_diagonal_pinch`: Cruce diagonal $2\times 2$ de grupos costeros (`water` o `sand`).
- `deep_water_exposed`: Agua profunda oceánica (`water_deep`) en contacto directo de 8 vecinos con tierra o arena sin anillo amortiguador de agua somera (`water`).
- `sand_dual_boundary`: Celda de playa (`sand`) atrapada simultáneamente entre agua y pasto sin anchura suficiente para cerrar ambas transiciones.

### 3.3 Dominio Caminos y Puentes (`path`)

- `path_sliver_or_orphan`: Camino de tierra de 1 tile de ancho, esquina interior en S sin representación en el brush de 13 tiles, camino invadiendo arena/agua/bordes de acantilado (`isBlockedPathElevationCell`), o mancha huérfana menor a 8 celdas desconectada de edificios, calles urbanas, plazas y puentes.
- `path_diagonal_pinch`: Cruce diagonal $2\times 2$ en `pathGrid`.

### 3.4 Dominio Macro-Bioma (`macro_biome`)

- `macro_biome_sliver`: Franja de 1 celda de ancho, cruce diagonal $2\times 2$, curva S sin esquina interior canónica (`hasDropped2DInnerCorner`), o invasión de un bioma secundario (`mint_highland`, `arid_desert`, `volcanic_plateau`) sobre celdas de playa (`sand`), agua o pie proyectado de montaña (`occupiedFootCells`).

---

## 4. Motor de Sanado y Renderizado sin Costuras

### 4.1 Reparación Semántica (`autotileHealingEngine.ts`)

[`test_aventura/logic/map/autotileHealingEngine.ts`](../logic/map/autotileHealingEngine.ts) aplica pases ordenados por jerarquía topológica:

1. **Montañas 2.5D**: Democión monótona de pinzamientos diagonales, solapes con agua, caídas abruptas y crestas/escalones de 1 columna o 1 fila, seguida de re-validación de pares `placedStairs`. Preserva intactos los conos rocosos aislados legítimos $1\times 1$ de nivel 1 (`peak_isolated`) y los salientes en L de anchura $\ge 2$ columnas y profundidad $\ge 2$ filas.
2. **Agua y Costas**: Inserción de amortiguador `water` alrededor de `water_deep`, poda de pinzamientos diagonales y suavizado por mayoría estricta ($\ge 3$ vecinos cardinales) preservando las playas costeras legítimas.
3. **Macro-Biomas**: Limpieza inmediata de `biomeGrid` a `'temperate_plains'` sobre arena, agua y pies de montaña (evitando que el pasto menta invada las playas), más erosión monótona de salientes de 1 celda y curvas S.
4. **Caminos**: Bloqueo sobre agua, arena, crestas y paredes sur de montaña, relleno en pase único de codos cóncavos válidos y poda iterativa de astillas de 1 celda y manchas huérfanas.

### 4.2 Proyección 2.5D y Pulido de Recorte en `canvasTerrainPathBlitter.ts`

En [`test_aventura/logic/map/canvasTerrainPathBlitter.ts`](../logic/map/canvasTerrainPathBlitter.ts):

- **Paredes Sur de Nivel 1 sobre Suelo (`elevation === 0`)**: `renderCellCliffs` dibuja siempre `northMtn.projectedFoot.tile` cuando la celda norte $(c, r - 1)$ proyecta cara sur sobre $(c, r)$ (salvo que exista puente o edificio), eliminando las mesetas de nivel 1 truncadas en su borde inferior.
- **Pulido Post-Recorte (`polishClippedPathGrid`)**: Tras aplicar la máscara `isPavedSector` y `buildingFootprintMask` (incluidas las reservas exteriores de camiones/muelles en `port_dock`), se rellenan codos válidos en pase único, se podan colas de 1 celda cortadas en el borde del halo de asentamientos y se eliminan fragmentos flotantes menores a 12 celdas sin anclaje real a edificios, calles urbanas, plazas, escaleras o puentes.

### 4.3 Redibujado Local por Rectángulo Sucio (`canvasViewportBlitter.ts`)

[`renderRegionalContinentDirtyRect`](../logic/map/canvasViewportBlitter.ts) aplica `ctx.clip()` al rectángulo expandido de impacto (`dirtyBounds` + margen de árboles/edificios 2.5D), rellena la base con el color oceánico `#0a1428` y ejecuta únicamente las instrucciones de blit que intersectan el área afectada, manteniendo respuesta instantánea a 60 FPS en escritorio y dispositivos móviles 5G.
