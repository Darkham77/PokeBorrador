# Plan de Implementación: Sistema de Lentes del Mapa de Aventura (Map Lenses)

## 1. Contexto y Propósito

Para erradicar la sobrecarga cognitiva y la saturación visual (*Visual Clutter*) que provocaría mostrar simultáneamente en pantalla las rutas, los climas, las aves legendarias, los jefes alfa, los enjambres, las barras de guerra de facciones y el progreso de la Pokédex, se implementa el sistema de **Lentes de Mapa (Map Lenses)**.

Inspirado en los filtros cartográficos de grandes videojuegos de estrategia y exploración, este sistema permite al entrenador cambiar instantáneamente el enfoque del mapa con un solo clic o atajo de teclado, presentando únicamente la información relevante para su objetivo actual.

### Principios Fundamentales

* **Cero Sobrecarga Cognitiva**: La información se segmenta en capas limpias y especializadas.
* **Transiciones GSAP Fluidas**: Los cambios entre vistas se realizan mediante un *cross-fade* acelerado por GPU (0.25s), sin parpadeos, recargas de página ni saltos de cámara.
* **Cero Peticiones de Red Adicionales**: Toda la información de las 3 capas reside reactivamente en los stores locales (`mapStore`, `warStore`, `gameStore`), garantizando un rendimiento constante a 60 FPS.
* **Persistencia de Preferencia**: El juego recuerda la lente seleccionada por el jugador en `localStorage('pvs_active_map_lens')`.

---

## 2. El Selector Segmentado GBA (`MapLensSwitcher.vue`)

Un widget metálico flotante en relieve, con diseño *Retro-Modern*, posicionado en la esquina superior derecha del mapa:

```text
┌─────────────────────────────────────────────────────────────┐
│  [🌿 Aventura (1)]   [⚔️ Guerra (2)]   [📖 Pokédex (3)]     │
└─────────────────────────────────────────────────────────────┘
```

* **Atajos de Teclado (PC)**: Teclas `1`, `2` y `3` para alternar rápidamente sin mover el ratón.
* **Interacción Móvil**: Botones táctiles optimizados con feedback háptico/visual instantáneo.
* **Estados Activos**: El botón seleccionado resalta con iluminación LED amarilla y marco dorado.

---

## 3. Especificación Detallada de las 3 Lentes de Mapa

```text
                                [MAPA DE AVENTURA]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   [🌿 LENTE AVENTURA]          [⚔️ LENTE DE GUERRA]        [📖 LENTE POKÉDEX]
   ├─ Arte y Clima              ├─ Borde Unión/Poder       ├─ Medalla 100% capturado
   ├─ Aves Errantes volando     ├─ Barras de Porcentaje    ├─ Contador (ej. 4/7)
   ├─ Corona Guardián 👑        ├─ Clan Protector          ├─ Siluetas de faltantes
   └─ Hierba Enjambre ✨        └─ Líneas de frente SVG    └─ Horarios/Pesca (🌙 🎣)
```

---

### 3.1 🌿 Lente 1: Vista Aventura / Exploración (Modo por Defecto)

* **Objetivo**: La experiencia clásica de rol y viaje Pokémon.
* **Elementos Visibles**:
  * Ilustración artística completa de la ruta o ciudad.
  * Clima atmosférico animado (lluvia, nieve, sol, niebla o tormenta de arena).
  * Ciclo día/noche.
  * **Eventos Vivos**:
    * Sombra o sprite de las **Aves Legendarias errantes** que sobrevuelan la ruta actual ([`sistema_legendarios_plan.md`](./sistema_legendarios_plan.md)).
    * Corona roja titilante del **Guardián Alfa 👑** ([`spawns_y_guardianes_plan.md`](./spawns_y_guardianes_plan.md)).
    * Hierba brillante de **Enjambre Temporal ✨**.
    * Silueta de **Entrenador Errante 🧢**.
  * Pokébola interactiva para inspeccionar la fauna de la ruta.
* **Elementos Ocultos**: Todas las barras de porcentaje, banderas de facción, puntos de territorio y nombres de clanes.

---

### 3.2 ⚔️ Lente 2: Vista de Guerra / Facciones (Geopolítica de Kanto)

* **Objetivo**: Estrategia comunitaria, coordinación de clanes y dominancia de rutas semanal ([`facciones_y_clanes_plan.md`](./facciones_y_clanes_plan.md)).
* **Elementos Visibles**:
  * **Marco de Dominancia**: Cada tarjeta se ilumina con el color del bando líder:
    * **Team Unión**: Borde platino/blanco con resplandor dorado.
    * **Team Poder**: Borde negro carbón con resplandor carmesí.
    * **Disputado**: Borde metálico neutral con destellos centrales.
  * **Barra de Progreso Territorial**: Barra visual horizontal en la parte inferior de la tarjeta:
    * `[ Unión 58% | 42% Poder ]`
  * **Puntos Aportados**: Muestra los PT sumados por el jugador y su clan hoy en esa ruta.
  * **Clan Protector**: Muestra el tag del clan que lidera la ruta (ej. `[TITAN]`).
  * **Bonos de Fin de Semana**: Si la ruta ya fue ganada (sábado/domingo), muestra la insignia de bono activo (+30% EXP / +30% Shiny para el bando vencedor).
  * **Líneas de Conexión SVG**: Las líneas entre nodos cambian de color, mostrando visualmente el "frente de batalla" que avanza sobre Kanto.
* **Elementos Ocultos**: Aves errantes, enjambres, clima invasivo y datos de hierba alta.

---

### 3.3 📖 Lente 3: Vista Pokédex / Hábitat (Coleccionismo)

* **Objetivo**: Completar la Pokédex de Kanto sin tener que abrir menús externos ni adivinar qué falta atrapar.
* **Elementos Visibles**:
  * **Insignia de Hábitat**:
    * 🟢 **Ruta Completada (Medalla Dorada)**: Indica que todos los Pokémon nativos de esa ruta ya han sido capturados y registrados.
    * 🟡 **En Progreso (ej. 5/8)**: Muestra un contador numérico claro.
  * **Rejilla de Especies Faltantes**: Miniaturas pixeladas en silueta negra de los Pokémon que aún no tienes de esa ruta, acompañadas de pequeños iconos de condición:
    * 🌙 *Nocturno*: Solo aparece de noche.
    * 🎣 *Pesca*: Requiere caña de pescar en el agua.
    * 🌧️ *Clima*: Solo aparece con lluvia o niebla.
* **Elementos Ocultos**: Datos de guerra de facciones, clanes y eventos de jefes alfa.

---

## 4. Arquitectura Frontend y Componentes

```text
src/
├── types/map/
│   └── mapLenses.ts               # type MapLens = 'adventure' | 'war' | 'pokedex'
├── stores/
│   └── mapLensStore.ts            # Store Pinia: lente activa, persistencia en localStorage
├── components/map/
│   ├── MapLensSwitcher.vue        # Barra metálica flotante con los 3 botones GBA
│   ├── layers/
│   │   ├── MapCardAdventureView.vue # Sub-capa de aventura (clima, eventos vivos, Pokébola)
│   │   ├── MapCardWarView.vue       # Sub-capa táctica (barras de porcentaje, clan, PTs)
│   │   └── MapCardPokedexView.vue   # Sub-capa de Pokédex (siluetas faltantes, medallas)
│   └── MapCard.vue                # Componente contenedor que orquesta el cross-fade GSAP
```

### 4.1 Orquestación de Transición con GSAP

```typescript
// Transición determinista entre capas internas de MapCard.vue
watch(() => lensStore.activeLens, (newLens) => {
  gsap.to('.map-card-layer-active', {
    opacity: 0,
    duration: 0.15,
    ease: 'power2.in',
    onComplete: () => {
      currentVisibleLayer.value = newLens;
      gsap.fromTo('.map-card-layer-active', 
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.20, ease: 'power2.out' }
      );
    }
  });
});
```

---

## 5. Estrategia de Pruebas y Verificación

1. **Pruebas Unitarias**:
   * `tests/unit/map/map_lens_store.spec.ts`: Verificar persistencia en `localStorage`, atajos de teclado y reactividad.
   * `tests/unit/map/pokedex_progress_helper.spec.ts`: Validar cálculo exacto de Pokémon capturados vs totales por ruta.
2. **Comando Debug CLI**:
   * Exponer en consola:

     ```javascript
     window.__VITE_DEBUG__.map.setLens('war');      // Cambia a vista de guerra
     window.__VITE_DEBUG__.map.setLens('pokedex');  // Cambia a vista de pokédex
     window.__VITE_DEBUG__.map.setLens('adventure');// Cambia a vista de aventura
     ```

---

## 6. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-LNS-01** | Segmentación Visual | 3 Lentes de Mapa especializadas (Aventura, Guerra, Pokédex). | Una sola vista con todos los iconos encendidos a la vez. | Elimina la sobrecarga cognitiva y preserva la estética Retro-Modern. |
| **ADR-LNS-02** | Control de Cambio | Selector Segmentado GBA flotante en esquina superior derecha con atajos 1, 2, 3. | Menú desplegable oculto en ajustes. | Acceso inmediato con un solo clic sin interrumpir la exploración. |
| **ADR-LNS-03** | Transición de Pantalla | Cross-fade GSAP interno sobre las tarjetas sin mover la cámara. | Redibujado completo del DOM o recarga de ruta. | Mantiene la fluidez a 60 FPS y la posición del jugador intacta. |
| **ADR-LNS-04** | Red y Datos | Datos locales precargados en Pinia stores. | Consulta HTTP a la API cada vez que se cambia de lente. | Cero latencia y funcionamiento offline fluido. |
