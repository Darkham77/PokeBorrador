# 📊 Reporte Especializado: Auditoría de Animaciones, Timers y GSAP

Este reporte analiza en detalle las violaciones detectadas por el motor de auditoría inteligente `audit_project.ts` en el proyecto **Poké Vicio**, excluyendo temporalmente el módulo de **showdown**.

> [!NOTE]
> De acuerdo con los lineamientos del archivo **AGENTS.md**, Poké Vicio prohíbe estrictamente el uso de animaciones manuales (CSS `@keyframes` o `transition`) y timers (`setTimeout`, `setInterval`) para controlar flujos visuales en la interfaz del cliente. Toda animación debe estar orquestada con **GSAP** de forma determinista.

## 📈 Resumen General de Violaciones (Sin Showdown)

* **Total de archivos analizados (con incidentes):** 231
* **Total de violaciones activas:** 466
  * 🔴 **Animaciones manuales (CSS/SASS):** 339
  * 🔴 **Timers prohibidos en UI (`setTimeout` / `setInterval`):** 0
  * 🟡 **Z-Index fuera de estándar:** 0
  * 🟡 **Falta `will-change` (GPU):** 10
  * 🟡 **Archivos que exceden límite de líneas (>300/500 SLOC):** 114
  * ⚪ **Otros incidentes:** 3

## 🔌 Análisis de Uso Directo de GSAP

Se ha escaneado la carpeta `src/` para identificar la presencia de integraciones legítimas con **GSAP**.

* **Archivos que importan o usan GSAP:** 94 archivos.
* **Usos detectados (referencias a `gsap`):** 791 ocurrencias.

### Top 10 Archivos con Mayor Integración de GSAP

| Archivo | Ocurrencias de GSAP | Propósito Visual |
| :--- | :---: | :--- |
| [`BattleCombatant.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleCombatant.vue) | 48 | Orquestación de efectos de combate, movimientos y barra de salud |
| [`MapCard.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/map/MapCard.vue) | 38 | Transición general de elementos y feedback táctil |
| [`AtmosphereLayer.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/common/AtmosphereLayer.vue) | 37 | Transición general de elementos y feedback táctil |
| [`gsapNick.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/directives/gsapNick.ts) | 23 | Transición general de elementos y feedback táctil |
| [`useParticleEngine.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/composables/useParticleEngine.ts) | 21 | Transición general de elementos y feedback táctil |
| [`LoginView.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/views/LoginView.vue) | 21 | Transición general de elementos y feedback táctil |
| [`DaycareSlot.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/DaycareSlot.vue) | 20 | Transición general de elementos y feedback táctil |
| [`ArenaModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/ArenaModal.vue) | 19 | Transición general de elementos y feedback táctil |
| [`HatchAnimationModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/HatchAnimationModal.vue) | 18 | Transición general de elementos y feedback táctil |
| [`HealModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/HealModal.vue) | 18 | Transición general de elementos y feedback táctil |

## 📦 Módulos Más Afectados (Mapeo de Impacto)

Se han clasificado los archivos con violaciones en **Módulos Lógicos** para entender qué áreas del juego sufren mayor desvío del estándar:

| Módulo Lógico | Total Incidencias | Animaciones CSS | Timers Prohibidos | GPU / Z-Index | Notas de Arquitectura |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Componentes Comunes / Otros** | **223** | 165 | 0 | 6 | Módulo regular en proceso de alineación. |
| **Componentes: Modales Globales** | **87** | 61 | 0 | 3 | Supera límites de SLOC por concentración de lógica de cosméticos y rankings. |
| **Estilos Globales & Core** | **37** | 36 | 0 | 0 | Contiene mixins de botones con transitions tradicionales. Deben migrarse a GSAP hover effects. |
| **Módulo: Batalla (Battle)** | **30** | 20 | 0 | 0 | Área más activa del motor de animación. El HUD tiene transiciones manuales que deben refactorizarse. |
| **Módulo: Administración & Debug** | **27** | 20 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Módulo: Crianza (Breeding)** | **18** | 13 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Estilos Vista de Cajas (PC)** | **11** | 10 | 0 | 0 | Alta densidad de transiciones manuales en filtros. Requiere migración a GSAP. |
| **Módulo: Estado Global (Stores)** | **10** | 0 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Scripts de Soporte & Utilidades** | **6** | 0 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Módulo: Juego General (Core)** | **5** | 5 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Módulo: Mochila (Bag)** | **4** | 3 | 0 | 0 | Visualizaciones y transiciones de uso de items directas en la hoja de estilos. |
| **Módulo: GTS / Comercio** | **3** | 2 | 0 | 1 | Módulo regular en proceso de alineación. |
| **Módulo: Social & Amigos** | **2** | 2 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Módulo: Pokedex** | **2** | 2 | 0 | 0 | Módulo regular en proceso de alineación. |
| **Módulo: Login & Autenticación** | **1** | 0 | 0 | 0 | Falta modularidad severa en la vista de Login (>600 líneas). |

---

## 🔍 Detalles por Módulo de Alto Impacto

### 📂 Módulo: Componentes Comunes / Otros (223 Violaciones)

Este módulo contiene lógica y estilos dedicados a las interacciones generales de la interfaz de usuario..

**Archivos críticos con violaciones:**

* [`src\styles\components\pokemon-detail\_vicio-panes.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/components/pokemon-detail/_vicio-panes.scss) - **8** violaciones de estándar.
  * *Animaciones manuales (CSS):* 7 transiciones/keyframes detectados.
* [`src\styles\components\_unified-pokemon-detail.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/components/_unified-pokemon-detail.scss) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\components\social\SocialRequestsTab.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/social/SocialRequestsTab.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\components\ranked\RankedMenu.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/ranked/RankedMenu.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\styles\components\_auth.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/components/_auth.scss) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.

### 📂 Módulo: Componentes: Modales Globales (87 Violaciones)

Este módulo contiene lógica y estilos dedicados a ventanas emergentes como perfiles de entrenador, rankings, configuraciones y cosméticos..

**Archivos críticos con violaciones:**

* [`src\components\modals\CosmeticsModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/CosmeticsModal.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\components\modals\FactionWarModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/FactionWarModal.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\modals\ClassSelectionModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/ClassSelectionModal.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\components\modals\MoveLearningModal.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/MoveLearningModal.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\components\modals\class\ClassDashboard.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/modals/class/ClassDashboard.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.

### 📂 Módulo: Estilos Globales & Core (37 Violaciones)

Este módulo contiene lógica y estilos dedicados a el layout general, reset CSS, mixins reutilizables y variables base de la interfaz..

**Archivos críticos con violaciones:**

* [`src\styles\core\mixins\_shop-standards.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/core/mixins/_shop-standards.scss) - **8** violaciones de estándar.
  * *Animaciones manuales (CSS):* 7 transiciones/keyframes detectados.
* [`src\styles\core\mixins\_pokemon.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/core/mixins/_pokemon.scss) - **6** violaciones de estándar.
  * *Animaciones manuales (CSS):* 6 transiciones/keyframes detectados.
* [`src\styles\layouts\_screens.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/layouts/_screens.scss) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 5 transiciones/keyframes detectados.
* [`src\styles\core\mixins\_buttons.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/core/mixins/_buttons.scss) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 5 transiciones/keyframes detectados.
* [`src\styles\layouts\_navigation.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/layouts/_navigation.scss) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.

### 📂 Módulo: Módulo: Batalla (Battle) (30 Violaciones)

Este módulo contiene lógica y estilos dedicados a el motor de combate por turnos, animaciones de ataque, estados y el HUD de arena..

**Archivos críticos con violaciones:**

* [`src\components\battle\BattleMovesGrid.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleMovesGrid.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\components\battle\BattleArenaView.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleArenaView.vue) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\battle\BattleBallPicker.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleBallPicker.vue) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\battle\BattleInfoCard.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleInfoCard.vue) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\battle\BattleArenaControls.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/battle/BattleArenaControls.vue) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 1 transiciones/keyframes detectados.

### 📂 Módulo: Módulo: Administración & Debug (27 Violaciones)

Este módulo contiene lógica y estilos dedicados a las interacciones generales de la interfaz de usuario..

**Archivos críticos con violaciones:**

* [`src\components\admin\debug\DebugAudioAnimTab.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/admin/debug/DebugAudioAnimTab.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\components\admin\debug\DebugStatsTab.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/admin/debug/DebugStatsTab.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\components\admin\debug\PokemonMovePicker.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/admin/debug/PokemonMovePicker.vue) - **4** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\styles\components\_debug-creator.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/components/_debug-creator.scss) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.
* [`src\styles\components\_debug.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/components/_debug.scss) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.

### 📂 Módulo: Módulo: Crianza (Breeding) (18 Violaciones)

Este módulo contiene lógica y estilos dedicados a el sistema de guardería, eclosión de huevos por pasos recorridos y genética Pokémon..

**Archivos críticos con violaciones:**

* [`src\components\breeding\IncubatingEggs.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/IncubatingEggs.vue) - **5** violaciones de estándar.
  * *Animaciones manuales (CSS):* 4 transiciones/keyframes detectados.
* [`src\components\breeding\WalkedEggsPanel.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/WalkedEggsPanel.vue) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\breeding\BreedingSlot.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/BreedingSlot.vue) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.
* [`src\components\breeding\BreedingSummary.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/BreedingSummary.vue) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 1 transiciones/keyframes detectados.
* [`src\components\breeding\EggWarehouse.vue`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/breeding/EggWarehouse.vue) - **2** violaciones de estándar.
  * *Animaciones manuales (CSS):* 2 transiciones/keyframes detectados.

### 📂 Módulo: Estilos Vista de Cajas (PC) (11 Violaciones)

Este módulo contiene lógica y estilos dedicados a la renderización de la cuadrícula de Pokémon, selección, filtros y caja de almacenamiento principal..

**Archivos críticos con violaciones:**

* [`src\styles\views\box\_filters.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/views/box/_filters.scss) - **8** violaciones de estándar.
  * *Animaciones manuales (CSS):* 7 transiciones/keyframes detectados.
* [`src\styles\views\box\_controls.scss`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/styles/views/box/_controls.scss) - **3** violaciones de estándar.
  * *Animaciones manuales (CSS):* 3 transiciones/keyframes detectados.

### 📂 Módulo: Módulo: Estado Global (Stores) (10 Violaciones)

Este módulo contiene lógica y estilos dedicados a las interacciones generales de la interfaz de usuario..

**Archivos críticos con violaciones:**

* [`src\types\stores.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/types/stores.ts) - **1** violaciones de estándar.
* [`src\stores\auth.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/stores/auth.ts) - **1** violaciones de estándar.
* [`src\stores\battle.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/stores/battle.ts) - **1** violaciones de estándar.
* [`src\stores\breeding.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/stores/breeding.ts) - **1** violaciones de estándar.
* [`src\stores\chatPrivate.ts`](file:///C:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/stores/chatPrivate.ts) - **1** violaciones de estándar.

## ⚠️ Foco en Timers Prohibidos (`setTimeout` / `setInterval`)

> [!WARNING]
> El uso de timers crudos para visuales es altamente peligroso. Provoca desincronización en cambios de pestañas o lag. A continuación se listan los timers prohibidos en UI activos:

*¡Excelente! No se encontraron timers crudos prohibidos en los archivos del frontend analizados (excluyendo showdown).*

## 💡 Recomendaciones del Estándar Poké Vicio

1. **Animaciones SASS/CSS (`transition` y `@keyframes`):** Deben ser migradas por completo a GSAP tweens (`gsap.to()`, `gsap.fromTo()`). Esto garantiza que el motor de renderizado controle toda la línea de tiempo y limpie los estados al finalizar.
2. **Promoción de Capa (GPU):** Los elementos interactivos que aplican transformaciones o filtros visuales intensos deben tener declarada la propiedad CSS `will-change` de forma selectiva para evitar layout thrashing.
3. **Z-Index Unificado:** Sustituir los valores numéricos hardcodeados (`z-index: 10`, `z-index: 50`, etc.) por variables semánticas basadas en `visuals.ts` (`var(--z-map-spawns)`, etc.).
4. **Modularidad:** Los archivos que superan las 300/500 líneas (como `LoginView.vue` u `WalkedEggsPanel.vue`) deben fragmentarse extrayendo sub-componentes y composables.
