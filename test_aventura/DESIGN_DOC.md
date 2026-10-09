# Documento de Diseño: Sistema de Viaje Aventura y MOs

Este documento detalla la arquitectura, el flujo de datos y la interfaz para el módulo de pruebas de viaje en formato "aventura", integrando el uso de la Bicicleta y las Máquinas Ocultas (MOs).

## 1. Resumen del Sistema

El juego actual funciona mediante navegación instantánea de un clic. Este módulo prototipa una alternativa donde viajar entre dos puntos distantes requiere recorrer una secuencia de mapas intermedios representados por una barra de viaje y eventos en ruta (obstáculos, pescas, combates).

## 2. Decisiones de Arquitectura e Integración

* **Entorno**: Se crea una ruta de desarrollo aislada `/test-aventura` cargada por `src/views/AdventureTestView.vue`.
* **Grafo de Kanto**: Se crea una representación geográfica explícita en `test aventura/kantoGraph.ts`.
* **Cálculo de Ruta**: Algoritmo BFS que encuentra la ruta más corta. Las aristas con requisitos de MO (ej. Surf para rutas de agua) solo se consideran transitables si el jugador tiene dicha MO activada en el panel del simulador.
* **Control de Animaciones**: Todas las transiciones de la barra de viaje y efectos se coordinan con **GSAP**, respetando la directiva de cero timers numéricos (`setTimeout`/`setInterval`).

## 3. Registro de Decisiones (Decision Log)

| Decisión | Alternativas | Razón de Elección |
| :--- | :--- | :--- |
| **Integración en Vue** | Archivo estático independiente | Permite reutilizar componentes existentes (`MapCard`, clima, lógica de estados) y seguir las directivas de diseño de `AGENTS.md`. |
| **Grafo Geográfico Dinámico** | Secuencia lineal simplificada | Proporciona un comportamiento realista y valida el impacto de desbloquear MOs (como abrir atajos o rutas marítimas). |
| **Panel de Simulación** | Integración directa con inventario real | Facilita probar el sistema en cualquier momento sin obligar al desarrollador a modificar su partida guardada para conseguir ítems o MOs específicos. |

## 4. Flujo del Viaje y Eventos

1. **Planificación**: El usuario selecciona Origen y Destino.
2. **Cálculo**: Se calcula la ruta BFS. Si no hay ruta transitable por falta de una MO (ej. Surf), se advierte al usuario o se toma una ruta terrestre alternativa más larga.
3. **Tránsito**: La barra de viaje se llena. El fondo dinámico y el clima cambian para reflejar el mapa intermedio actual.
4. **Interrupción por Evento**:
   * **Obstáculos MO** (ej. Arbusto): Detiene el viaje. Si el usuario activa la MO Corte, se limpia con una animación GSAP y se otorga una recompensa rápida.
   * **Combate / Pesca**: Aparecen Pokémon salvajes o entrenadores simulados para resolver.
5. **Llegada**: Al llenarse la barra al 100%, se actualiza el mapa actual del jugador en `mapStore`.
