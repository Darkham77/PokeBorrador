# Plan de Implementación: Integración del Mapa de Aventura y Hubs de Ciudades

## 1. Contexto y Propósito

Este documento establece la especificación para graduar el prototipo del **Mapa de Aventura** (`test aventura`) a la experiencia oficial y definitiva de exploración de **Poké Vicio**.

Reemplaza la navegación estática por una experiencia inmersiva basada en una red cartográfica interactiva de Kanto, donde cada nodo es una tarjeta viva [`MapCard.vue`](file:///d:/Documentos/GitHub/PokeBorrador/src/components/map/MapCard.vue).

### Principios Fundamentales
* **Doble Estado de Control**: Diferenciación estricta entre viajar hacia una ruta (clic lejano) e interactuar con su contenido (clic estacionado).
* **Supresión de la Energía Artificial**: Eliminación de la barra de 100 de energía. Caminar y andar en bicicleta es libre; la verdadera limitación reside en los obstáculos de MO y la salud del equipo Pokémon.
* **Ciudades como Hubs Comerciales y Cívicos**: Las Tiendas Pokémon (PokéMarts) son exclusivas de las ciudades; ningún entrenador puede comprar suministros en mitad de una cueva o ruta salvaje.
* **Integración Total con Showdown**: Entrar en combate desde la tarjeta despliega la `<BattleArena />` oficial de forma fluida.

---

## 2. Mecánica de Control e Interacción (Dos Estados)

Para evitar colisiones entre el movimiento de cámara y la apertura de ventanas, el mapa opera bajo dos estados excluyentes:

```text
[ESTADO 1: Nodo Lejano / En Tránsito]
 └─ Clic en cualquier tarjeta o nodo ──► Planifica ruta con Dijkstra y viaja
 └─ Eventos internos bloqueados (pointer-events: none) para evitar abrir modales por error

                     │  (El jugador llega al nodo)
                     ▼

[ESTADO 2: Estacionado en la Tarjeta]
 └─ La cámara se centra y aplica zoom in (ZOOM_SCALE)
 └─ La tarjeta actual activa pointer-events: auto
 └─ Interactividad completa según el tipo de nodo (Ruta vs Ciudad)
```

---

## 3. Rutas Salvajes y POIs de Aventura

Al estar estacionado sobre una tarjeta de **Ruta** o **Punto de Interés** (ej. Ruta 1, Bosque Verde, Islas Espuma):

1. **Clic en la Pokébola de la Tarjeta**:
   * Abre el modal oficial `RouteSpawns`.
   * Muestra la fauna autóctona de la zona, probabilidades según el clima actual y marca cuáles ya han sido capturados para la Pokédex.
2. **Clic en la Tarjeta / Área de Hierba Alta**:
   * Valida que el jugador tenga al menos un Pokémon consciente en `gameStore.state.team`.
   * Invoca `mapStore.navigate(officialMapId)`.
   * Genera el encuentro salvaje, pescador o entrenador de ruta y abre automáticamente la arena de combate **Pokémon Showdown** (`<BattleArena />`).
   * Al finalizar el combate, la arena se cierra y el jugador vuelve a quedar posicionado en su ruta.

---

## 4. Ciudades y Meseta Añil (Hubs de Servicio)

Al llegar y estacionar en una **Ciudad** (ej. Ciudad Plateada, Celeste, Carmín, Azulona), la tarjeta no ofrece combates salvajes ordinarios, sino acceso directo a la infraestructura urbana:

```text
┌────────────────────────────────────────────────────────┐
│                   CIUDAD CELESTE                       │
│             [Ilustración urbana de Kanto]              │
├────────────────────────────────────────────────────────┤
│  [🏥 CENTRO POKÉMON]   [🏪 TIENDA (POKÉMART)]         │
│                                                        │
│  [⚡ GIMNASIO CELESTE] (Si la ciudad tiene gimnasio)   │
└────────────────────────────────────────────────────────┘
```

1. **🏥 Centro Pokémon**:
   * Abre el modal `PokemonCenter` para curar la salud y estados de todo el equipo de forma segura con la clásica jingle de la enfermera Joy.
   * Aplica el cooldown configurado según el nivel de entrenador.
2. **🏪 Tienda Pokémon (PokéMart)**:
   * **Restricción de Rol**: Solo accesible dentro de las ciudades.
   * Abre el modal de compras (`ShopModal`) para adquirir Pokébolas, pociones, antídotos y repelentes con el Pokéyen ganado en combate.
3. **⚡ Gimnasio Pokémon**:
   * Si la ciudad posee un gimnasio oficial de Kanto (Plateada, Celeste, Carmín, Azulona, Fucsia, Azafrán, Canela o Verde):
     * Muestra el sprite del Líder y el estado de la medalla (Conquistada / Pendiente).
     * Permite desafiar a los súbditos y al Líder de Gimnasio en combate oficial de Showdown.

---

## 5. Supresión del Sistema de Energía

1. **Eliminación de `playerEnergy`**:
   * Se remueve el consumo de 5 de energía por nodo en `confirmTravel()`.
   * Se elimina la barra de energía del HUD de aventura.
2. **Condición de Bloqueo de Aventura**:
   * Si todos los Pokémon del equipo están debilitados (0 PS), el jugador aún puede caminar o viajar libremente de regreso a una ciudad para curarse en el Centro Pokémon, pero **no puede entrar en combate** ni iniciar encuentros en la hierba alta.

---

## 6. Arquitectura Técnica y Pasos de Migración

```text
test aventura/ (o src/views/adventure/)
  ├── App.vue / AdventureView.vue
  │     ├── Activar pointer-events: auto condicional: 
  │     │   :style="{ pointerEvents: (currentNode === id && isZoomedIn && !isMoving) ? 'auto' : 'none' }"
  │     ├── Eliminar modalStore.open = () => {} (permitir modales reales del juego)
  │     ├── Conectar @navigate="onCardNavigate" con mapStore.navigate(mapLocation.id)
  │     └── Integrar botones de Ciudad: openPokemonCenter(), openPokeMart(), openGym()
  └── mapData.ts
        └── Homologar los IDs de nodo con los IDs oficiales (FIRE_RED_MAPS)
```

---

## 7. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-MAP-01** | Control de Tarjetas | Clic lejano viaja; clic estacionado interactúa. | Clic en tarjeta abre modal de viaje siempre. | Evita clics accidentales y hace intuitivo el desplazamiento. |
| **ADR-MAP-02** | Energía de Viaje | Supresión total de la energía de pasos (viaje libre). | Conservar 100 de energía y recargar con dinero. | Principio de diversión y eliminación de mecánicas móviles obsoletas. |
| **ADR-MAP-03** | Acceso a Tiendas | Tiendas NPC exclusivas de las Ciudades en el mapa. | Tienda flotante accesible desde cualquier ruta. | Coherencia de rol e incentivo para visitar y volver a las ciudades. |
| **ADR-MAP-04** | Combate en Ruta | Integración directa de la tarjeta con `mapStore.navigate()` y Showdown. | Minijuego de combate separado o simulador de texto. | Máxima fidelidad con el motor de batalla existente del proyecto. |
