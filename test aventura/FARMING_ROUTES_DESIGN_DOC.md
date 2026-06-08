# Documento de Diseño: Sistema de Rutas de Farmeo (Pokevicio)

## 1. Introducción

Este documento detalla la propuesta para un nuevo sistema de Rutas de Farmeo en Pokevicio, inspirado en las mecánicas de recolección y progresión de juegos tipo Diablo, fusionadas con el universo Pokémon. El objetivo es enriquecer la experiencia de viaje y exploración, ofreciendo a los jugadores la posibilidad de planificar expediciones estratégicas para la obtención de recursos específicos, influenciadas por su equipo Pokémon, herramientas y las condiciones ambientales.

## 2. Conceptos Clave

### 2.1. Rutas de Farmeo

Las Rutas de Farmeo son secuencias de mapas intermedios que el jugador puede seleccionar para transitar con un propósito específico: recolectar un tipo de recurso. A diferencia del viaje estándar, que busca la ruta más corta, las rutas de farmeo pueden priorizar mapas con alta densidad de un recurso deseado, incluso si esto implica un camino más largo o desafiante.

**Características:**
*   **Selección de Recurso:** El jugador elige qué tipo de recurso desea farmear (ej. Minerales, Bayas, Ingredientes de Cocina, Materiales de Crafteo).
*   **Planificación Estratégica:** El sistema sugerirá rutas optimizadas para el recurso seleccionado, mostrando los posibles beneficios y desafíos.
*   **Eventos Dinámicos:** Durante el tránsito, el jugador se encontrará con minijuegos de recolección, combates y eventos climáticos que impactarán la eficiencia del farmeo.

### 2.2. Tipos de Recursos

Se introducirán diversos tipos de recursos, cada uno asociado a entornos específicos y métodos de recolección:

| Tipo de Recurso | Entornos Típicos | Métodos de Recolección | Uso Principal |
| :-------------- | :--------------- | :--------------------- | :------------ |
| **Minerales**   | Cuevas, Montañas | Minijuego de Minería   | Crafteo de herramientas, mejoras de equipo |
| **Bayas**       | Bosques, Praderas | Recolección manual, Minijuego de Jardinería | Crafteo de pociones, comida para Pokémon |
| **Peces**       | Lagos, Ríos, Océanos | Minijuego de Pesca     | Ingredientes de cocina, crafteo de objetos acuáticos |
| **Madera**      | Bosques, Selvas  | Minijuego de Tala      | Crafteo de estructuras, herramientas |
| **Hierbas**     | Praderas, Pantanos | Recolección manual, Minijuego de Herboristería | Crafteo de medicinas, tintes |

### 2.3. Buffs de Pokémon

Los Pokémon en el equipo del jugador podrán otorgar buffs pasivos que mejoran la eficiencia del farmeo. Estos buffs se activarán automáticamente al iniciar una Ruta de Farmeo y se mostrarán en la pantalla de planificación.

**Ejemplos de Buffs:**
*   **Velocidad de Movimiento:** Ciertos Pokémon (ej. Rapidash, Dodrio) pueden aumentar la velocidad de viaje en la ruta.
*   **Probabilidad de Minijuego:** Pokémon con habilidades específicas (ej. Excavación para minería, Recogida para botín) pueden aumentar la chance de activar minijuegos de recolección o mejorar sus recompensas.
*   **Buffs de Recolección Específicos:** Pokémon de tipo Roca/Tierra pueden aumentar la eficiencia en la minería, tipo Planta en la recolección de bayas, etc.
*   **Resistencia al Clima:** Pokémon de tipo Hielo o Fuego pueden mitigar los efectos negativos del frío o calor extremo.

### 2.4. Equipo del Personaje

El personaje del jugador podrá equipar herramientas y ropa que impacten directamente en el farmeo y la supervivencia.

**Ejemplos de Equipo:**
*   **Herramientas:** Picos (mejoran minería), Cañas de Pescar (mejoran pesca), Hachas (mejoran tala). Estas herramientas pueden tener diferentes "calidades" o "niveles" que otorgan mayores bonificaciones.
*   **Ropa:** Atuendos específicos para el clima (ej. Abrigos para invierno, Trajes de buceo para zonas acuáticas) que reducen penalizaciones o incluso otorgan bonificaciones en dichos entornos.

### 2.5. Minijuegos de Recolección

Para hacer la recolección más interactiva, se introducirán minijuegos contextuales. La probabilidad de activar un minijuego y su dificultad/recompensa pueden ser influenciadas por los buffs de Pokémon y el equipo.

**Ejemplos:**
*   **Minería:** Un minijuego de ritmo o precisión donde el jugador debe golpear puntos específicos en una roca para extraer minerales.
*   **Pesca:** Un minijuego similar a los de otros juegos de Pokémon, pero con mayor profundidad y posibles recompensas raras.
*   **Jardinería:** Un minijuego de reacción rápida para cosechar bayas maduras o identificar plantas raras.

### 2.6. Clima y Supervivencia

El sistema de clima existente (`getRouteWeather` en `useAdventureSimulation.ts`) se integrará más profundamente, afectando las Rutas de Farmeo.

**Impacto del Clima:**
*   **Penalizaciones:** Clima extremo (nieve, tormentas de arena, lluvia torrencial) puede reducir la velocidad de movimiento, la eficiencia de recolección o incluso causar daño al personaje/Pokémon si no están adecuadamente preparados.
*   **Bonificaciones:** Ciertos climas pueden aumentar la aparición de Pokémon específicos o la calidad de ciertos recursos (ej. Pokémon de agua en lluvia, bayas raras en climas húmedos).
*   **Monturas:** La idea de usar un Pokémon de hielo como montura en invierno para evitar penalizaciones de nieve es excelente y se integraría aquí.

## 3. Arquitectura y Flujo del Sistema

El sistema de Rutas de Farmeo se construirá sobre la base del módulo de viaje aventura existente, extendiendo sus funcionalidades.

### 3.1. Integración con el Sistema de Viaje Existente

El `useAdventureSimulation.ts` y `kantoGraph.ts` serán los puntos de integración clave. La planificación de una Ruta de Farmeo será una opción dentro de la interfaz de planificación de viaje, donde el jugador seleccionará un destino y, adicionalmente, un tipo de recurso a farmear.

### 3.2. Definición y Cálculo de Rutas de Farmeo

Se necesitará una extensión del `kantoGraph.ts` o un nuevo grafo que mapee los recursos disponibles en cada nodo (mapa) y arista (conexión entre mapas). El algoritmo `findShortestPath` podría adaptarse o complementarse con un algoritmo de búsqueda que priorice nodos con el recurso deseado, incluso si la distancia es mayor.

**Propuesta:**
*   Añadir una propiedad `resources: { [resourceType: string]: number }` a `MapLocation` (definido en `src/types/encounters.ts`) para indicar la abundancia de recursos en un mapa.
*   Modificar `findShortestPath` o crear una nueva función `findFarmingPath` que, además de considerar las MOs, evalúe la "puntuación de farmeo" de cada ruta basada en la densidad del recurso deseado.

### 3.3. Aplicación de Buffs y Previsualización

Antes de confirmar la ruta, el sistema calculará y mostrará al jugador un resumen de los buffs activos. Esto se logrará extendiendo la lógica en `useAdventureSimulation.ts`.

**Flujo:**
1.  El jugador selecciona el tipo de recurso y la ruta deseada.
2.  El sistema identifica los Pokémon activos en el equipo del jugador y sus habilidades pasivas relevantes para el farmeo (ej. `ADVENTURE_PASSIVES` extendido).
3.  Se detecta el equipo del personaje (herramientas, ropa) y sus bonificaciones.
4.  Se evalúa el clima predominante en la ruta planificada.
5.  Todos estos factores se combinan para calcular los buffs finales (ej. `Chance de minijuego de minería +30%`, `Velocidad de movimiento +15%`, `Resistencia al frío +20%`).
6.  Estos buffs se muestran en una interfaz de previsualización antes de que el jugador confirme el inicio del viaje.

### 3.4. Eventos en Ruta y Minijuegos

El `travelProgress` y el sistema de eventos en ruta (`useAdventureEvents.ts`) se adaptarán para disparar minijuegos de recolección en puntos específicos de la ruta o con una probabilidad basada en los buffs.

**Integración:**
*   El `activeEvent` en `useAdventureSimulation.ts` se expandirá para incluir tipos de eventos de minijuego (ej. `'mining_minigame'`, `'fishing_minigame'`).
*   La lógica de `handleMinigameWin` y `handleMinigameFail` se extenderá para otorgar los recursos farmeados y aplicar efectos basados en el éxito/fracaso.

### 3.5. Interfaz de Usuario (UI)

La `AdventureTestView.vue` necesitará modificaciones significativas para soportar la nueva funcionalidad:

*   **Panel de Planificación de Ruta:** Un nuevo panel donde el jugador pueda:
    *   Seleccionar el tipo de recurso a farmear.
    *   Visualizar las rutas sugeridas en el mapa.
    *   Ver los Pokémon en su equipo y sus buffs activos.
    *   Equipar herramientas y ropa.
    *   Previsualizar los buffs finales antes de confirmar el viaje.
*   **Indicadores en Ruta:** Durante el viaje, se mostrarán iconos o barras de progreso para los buffs activos y el clima actual.

## 4. Detalles Técnicos y Extensiones Propuestas

### 4.1. Extensión de Tipos (`src/types/`)

*   **`pokemon.ts`:**
    *   Añadir `farmingPassives?: { [passiveId: string]: number }` a la interfaz `Pokemon` para definir buffs específicos de farmeo que un Pokémon puede otorgar.
    *   Ejemplo: `{ miningBonus: 0.15, movementSpeedBonus: 0.10 }`.
*   **`items.ts`:**
    *   Añadir `farmingBonus?: { [bonusType: string]: number }` a la interfaz `Item` para herramientas y ropa.
    *   Añadir `weatherResistance?: { [weatherType: string]: number }` para ropa.
    *   Ejemplo para un pico: `{ miningPower: 1.2, minigameChance: 0.3 }`.

### 4.2. Lógica de Simulación (`src/composables/adventure/useAdventureSimulation.ts`)

*   **`ADVENTURE_PASSIVES`:** Extender este objeto para incluir todos los buffs de farmeo y sus IDs.
*   **Cálculo de `activeTravelModifiers`:** Modificar esta función para que, además de los buffs de viaje existentes, incorpore los buffs de farmeo de los Pokémon del equipo y del equipo del personaje.
*   **Gestión de Clima:** Integrar la lógica de resistencia al clima del equipo y Pokémon para ajustar las penalizaciones o bonificaciones climáticas.
*   **Minijuegos:** Implementar la lógica para disparar los minijuegos de recolección, pasar los parámetros de buffs y procesar los resultados.

### 4.3. Grafo de Kanto (`test aventura/kantoGraph.ts`)

*   **`KANTO_CONNECTIONS`:** Considerar añadir una propiedad `resourceNodes?: { [resourceType: string]: number }` a cada `Connection` o a los nodos en `KANTO_NODE_POSITIONS` para indicar la presencia y abundancia de recursos.
    *   Ejemplo: `route3: [{ target: 'mt_moon', resourceNodes: { minerals: 5 } }]`.
*   **`findFarmingPath`:** Desarrollar una nueva función de búsqueda de rutas que priorice la cantidad de recursos del tipo seleccionado a lo largo del camino, además de la transitabilidad por MOs.

## 5. Consideraciones Adicionales

### 5.1. Balanceo del Juego

El balanceo será crucial para que el sistema sea gratificante sin ser explotable. Esto incluirá:
*   Ajustar las tasas de aparición de recursos y las recompensas de los minijuegos.
*   Definir la magnitud de los buffs de Pokémon y equipo.
*   Establecer penalizaciones de clima que sean significativas pero no frustrantes.

### 5.2. Progresión del Jugador

El sistema de Rutas de Farmeo debe integrarse con la progresión general del jugador, ofreciendo:
*   Recursos para mejorar el equipo y las herramientas, lo que a su vez permite acceder a mejores rutas o farmear más eficientemente.
*   Una nueva vía para obtener objetos raros o materiales para craftear ítems únicos.
*   Incentivos para capturar y entrenar Pokémon con habilidades de farmeo específicas.

### 5.3. Futuras Extensiones

*   **Eventos de Temporada:** El sistema de clima y estaciones podría influir en la disponibilidad y abundancia de ciertos recursos (ej. Bayas de invierno solo en invierno).
*   **Pokémon de Montura:** Implementar la mecánica de Pokémon de montura que otorgan buffs de viaje o resistencia al clima (ej. un Lapras para viajar por agua en invierno sin penalizaciones).
*   **Crafteo Avanzado:** Un sistema de crafteo más profundo que utilice los recursos obtenidos para crear objetos, pociones, o incluso personalizar la ropa del personaje.

## 6. Referencias

*   [1] `DESIGN_DOC.md` - Documento de Diseño: Sistema de Viaje Aventura y MOs. `/home/ubuntu/PokeBorrador/test aventura/DESIGN_DOC.md`
*   [2] `pokemon.ts` - Definiciones de tipos para Pokémon. `/home/ubuntu/PokeBorrador/src/types/pokemon.ts`
*   [3] `items.ts` - Definiciones de tipos para ítems. `/home/ubuntu/PokeBorrador/src/types/items.ts`
*   [4] `useAdventureSimulation.ts` - Lógica de simulación de aventura. `/home/ubuntu/PokeBorrador/src/composables/adventure/useAdventureSimulation.ts`
*   [5] `kantoGraph.ts` - Grafo de conexiones del mapa de Kanto. `/home/ubuntu/PokeBorrador/test aventura/kantoGraph.ts`
`
