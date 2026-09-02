# Plan de Implementación: Guardado de Rutas Personalizadas y Biomas de Farmeo

## 1. Contexto y Propósito

Este documento establece el diseño y arquitectura técnica para el sistema de **Trazado y Guardado de Rutas Personalizadas** en el Mapa de Aventura de **Poké Vicio**.

Permite que el entrenador deje de depender exclusivamente del cálculo automático del camino más corto y pueda diseñar manualmente expediciones a medida. Al seleccionar qué caminos, cuevas, costas o ciudades atravesar, el sistema analiza los **biomas** del recorrido, calculando en tiempo real la probabilidad de eventos específicos (bayas, minería/fósiles, pesca o combates con entrenadores) para que el jugador elija qué recurso desea farmear.

### Principios Fundamentales

* **Libertad Topológica**: Soporte completo para rutas lineales (de ciudad A a ciudad B) y **circuitos cerrados** (bucles de patrulla que regresan al punto de partida para curar al equipo).
* **Especialización por Biomas**: Cada mapa de Kanto aporta un peso porcentual a la probabilidad de eventos según su geografía natural.
* **Sinergia con Habilidades de Equipo**: Los multiplicadores del terreno se fusionan con las pasivas de los 6 Pokémon del equipo ([`habilidades_equipo_aventura_plan.md`](./habilidades_equipo_aventura_plan.md)).
* **Persistencia en 5 Slots**: Capacidad para guardar hasta 5 rutas personalizadas con nombre propio en el perfil del jugador (`gameStore.state.savedRoutes`).

---

## 2. Clasificación de Biomas de Kanto y Eventos Específicos

Cada nodo del mapa cartográfico se clasifica dentro de uno de los cuatro biomas fundamentales:

```text
                                [NODOS DE KANTO]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
       🌿 VEGETACIÓN               ⛰️ MONTAÑA                 🌊 ACUÁTICO
   (Bosques / Praderas)        (Cavernas / Túneles)       (Costas / Océanos)
   ├─ Arbustos de Bayas        ├─ Vetas de Minería        ├─ Bancos de Pesca
   ├─ Néctar y Semillas        ├─ Fósiles y Pepitas       ├─ Perlas y Conchas
   └─ Bicho / Planta           └─ Piedras Evolutivas      └─ Pokémon Marinos
                                        │
                                        ▼
                                 🛣️ SENDEROS
                              (Rutas / Puentes)
                              ├─ Entrenadores NPC
                              ├─ Dinero Pokéyen (P¥)
                              └─ Experiencia Alta
```

### Tabla de Biomas de Kanto

1. 🌿 **Vegetación / Bosques** (Rutas 1, 2, Bosque Verde, Rutas 24-25, Zona Safari):
   * *Evento Principal*: **Arbusto de Bayas Silvestres** (recolectar bayas Zreza, Meloc, Aranja para mochila o cultivo).
2. ⛰️ **Montaña / Cavernas** (Mt. Moon, Túnel Roca, Ruta 4, Calle Victoria):
   * *Evento Principal*: **Veta de Minería / Roca Rompible** (extracción de fósiles hélix/domo, trozos estrella, pepitas y piedras evolutivas).
3. 🌊 **Acuático / Costero** (Rutas 19, 20, 21, Islas Espuma, Puerto Carmín):
   * *Evento Principal*: **Bancos de Pesca** (encuentros de pesca con caña, perlas grandes y Pokémon acuáticos).
4. 🛣️ **Senderos Abiertos / Puentes** (Rutas 3, 6, 8, 11, Camino de Bicis / Rutas 16-18):
   * *Evento Principal*: **Emboscadas de Entrenadores** (Cazabichos, Pescadores, Motoristas) con recompensas infladas de dinero P¥ y EXP.

---

## 3. Modo Creador de Rutas y Cálculo de Afinidad en Tiempo Real

### 3.1 Flujo de Trazado de Waypoints

1. El jugador pulsa el botón **"Trazar Nueva Ruta"** en el mapa.
2. El mapa entra en modo planificación: el jugador va tocando los nodos en secuencia:
   * *Ejemplo*: `Pallet Town ──► Ruta 1 ──► Ciudad Verde ──► Ruta 22 ──► Bosque Verde ──► Ciudad Plateada`.
3. El sistema traza las líneas doradas de vista previa y verifica:
   * Que los tramos estén interconectados en el grafo.
   * Que el jugador cumpla con los requisitos de MO (Corte para arbustos, Surf para tramos de agua).
4. El jugador puede cerrar el circuito volviendo al punto de inicio o finalizar en un nuevo destino.

### 3.2 Cálculo Ponderado de Eventos

A medida que se agregan nodos, una barra segmentada en el HUD calcula la afinidad:

$$\% \text{Evento} = \frac{\sum \text{Nodos del Bioma}}{\text{Total de Nodos de Ruta}} \times 100$$

* *Ejemplo*: En una ruta de 5 nodos con 3 de Vegetación y 2 de Montaña:
  * **Bayas y Plantas**: 60%
  * **Minería y Fósiles**: 40%
* **Fusión con Habilidades de Equipo**:
  * Si llevas a **Meowth (Recogida)**: añade tiradas adicionales de botín en cada parada.
  * Si llevas a **Gyarados (Intimidación)**: el peso de combates con entrenadores aumenta un +30% relativo.
  * Si llevas a **Magnemite (Imán)**: en las paradas de montaña duplica el hallazgo de minerales.

---

## 4. Viaje con Paradas Interactivas y Resumen Final (Loot Recap)

1. **Desplazamiento Animado con GSAP**:
   * El avatar (caminando, en bici o surfeando) avanza a velocidad constante por los senderos planificados.
2. **Paradas Interactivas de Evento**:
   * Al alcanzar un nodo o segmento donde se dispara un evento:
     * El avatar se detiene suavemente.
     * Suena la campana/alerta de evento y se despliega la ventana interactiva:
       * *Combate*: Salta a Showdown para pelear contra el entrenador o Pokémon salvaje.
       * *Minería*: Minijuego de excavación con pico.
       * *Bayas*: Cosecha interactiva de los arbustos del camino.
     * Al resolverse el evento, el viaje se reanuda automáticamente hacia el siguiente nodo.
3. **Resumen de Expedición (Loot Recap)**:
   * Al llegar al destino final o completar la vuelta del circuito cerrado:
     * Se abre el modal conmemorativo con sonido de victoria.
     * Desglosa:
       * Total de P¥ ganado.
       * Bayas y minerales recolectados.
       * Objetos encontrados por *Recogida*.
       * Experiencia total acumulada para los 6 Pokémon del equipo.

---

## 5. Persistencia y Gestión de 5 Slots de Rutas

Las rutas personalizadas se almacenan dentro del estado del juego (`gameStore.state.savedRoutes`):

```typescript
export interface SavedRoute {
  id: string;              // UUID único
  name: string;            // Nombre asignado (ej. "Vuelta de Pesca de Kanto")
  nodeIds: string[];       // Secuencia de nodos ['pallet', 'route1', 'viridian', ...]
  isLoop: boolean;         // true si empieza y termina en el mismo nodo
  estimatedDurationSecs: number; // Tiempo estimado a velocidad normal
  biomeAffinity: {
    berries: number;       // % afinidad de bayas
    mining: number;        // % afinidad de minería
    fishing: number;       // % afinidad de pesca
    trainers: number;      // % afinidad de entrenadores
  };
  createdAt: number;       // Timestamp
}
```

* **Interfaz de Ranuras**:
  * Un desplegable en el mapa muestra los 5 slots: `[ Slot 1: "Caza de Fósiles" | Slot 2: "Ruta de Bayas" | Slot 3: Vacío ... ]`.
  * Cargar una ruta guardada resalta instantáneamente todo el camino en el mapa y prepara el botón **"Iniciar Expedición"** en un solo clic.
  * Opciones para renombrar, sobreescribir o eliminar cualquier slot en cualquier momento.

---

## 6. Arquitectura Técnica y Módulos

```text
src/
├── types/adventure/
│   └── savedRoutes.ts             # Interfaz SavedRoute y BiomeType
├── data/adventure/
│   └── kantoBiomes.ts             # Diccionario de asignación de bioma por ID de mapa
├── logic/adventure/
│   ├── routeAffinityCalculator.ts # Cálculo ponderado de % de eventos + buffs de equipo
│   └── waypointValidator.ts      # Validación de conectividad y requisitos de MO entre nodos
├── components/adventure/
│   ├── RouteWaypointPlanner.vue   # Interfaz de trazado manual con feedback visual de líneas
│   ├── SavedRoutesDropdown.vue    # Selector y gestor de los 5 slots de guardado
│   └── ExpeditionLootRecap.vue    # Modal final con desglose de recompensas acumuladas
└── stores/
    └── mapStore.ts                # Gestión reactiva de savedRoutes y ejecución de viaje
```

---

## 7. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-RUT-01** | Topología | Permitir circuitos lineales y cerrados (bucles). | Solo permitir viajes de A a B lineales. | Facilita patrullar y farmear recursos regresando al Centro Pokémon sin pasos manuales extra. |
| **ADR-RUT-02** | Ritmo de Viaje | Paradas interactivas ante eventos + Resumen final. | Ejecución invisible en segundo plano o avance sin pausas. | Preserva el sentido de aventura y la emoción de encontrarse con eventos en el camino. |
| **ADR-RUT-03** | Almacenamiento | 5 Slots persistentes en la partida con nombres libres. | Guardado temporal volátil o ranuras infinitas. | 5 ranuras son más que suficientes para cubrir las necesidades tácticas y mantienen la persistencia ligera. |
| **ADR-RUT-04** | Biomas de Kanto | 4 Categorías canónicas (Vegetación, Montaña, Agua, Senderos). | Porcentajes aleatorios en cada partida. | Da coherencia al mundo de Kanto: sabes exactamente a dónde ir para buscar bayas, minerales o peces. |
