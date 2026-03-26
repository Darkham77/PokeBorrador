# 🧑‍🤝‍🧑 Clases y Mecánicas Únicas (Enfoque Técnico)

Este documento presenta un diseño técnico para las clases de jugador, detallando mecánicas únicas con valores numéricos y su integración con las variables existentes del juego. El objetivo es ofrecer roles distintivos que incentiven la rejugabilidad y la interacción estratégica, adaptándose a la estructura actual del borrador.

## 1. Equipo Rocket

**Concepto:** Una clase orientada a la maximización de ganancias económicas a través de métodos alternativos y la explotación de recursos. Su estilo de juego implica una gestión de riesgos y recompensas, con un enfoque en el mercado y la influencia.

**Mecánicas Técnicas:**

| Mecánica | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Venta en el Mercado Negro** | Los Pokémon capturados (no en equipo activo) pueden venderse por `₽ = (ValorBasePokémon * 1.5)`. La venta de Pokémon robados a NPCs (misiones) puede generar `₽ = (ValorBasePokémon * 2.0)`. | Modificar la función de venta de Pokémon (`js/08_shop.js` o similar) para incluir un `if (player.class === 'Equipo Rocket')` y aplicar el multiplicador. Introducir un nuevo tipo de Pokémon `stolenPokemon` con un flag `isStolen` para la venta a NPCs. |
| **Costos de Servicio Elevados** | Los servicios de Centros Pokémon y Guarderías tienen un costo `2.5x` mayor para los jugadores del Equipo Rocket. | Modificar las funciones de `healPokemon()` y `daycareServices()` para aplicar un multiplicador de costo basado en la clase del jugador. |
| **Habilidad 'Robo Rápido'** | Al inicio de un combate contra un entrenador NPC, `probabilidadRobo = 0.15 + (NivelClase * 0.01)`, hasta un máximo de `0.30`. El objeto robado se selecciona de una tabla de botín (`lootTable`) de NPCs. | En `js/07_battle.js`, dentro de `startBattle()` o una función de inicio de combate contra NPC, añadir una comprobación de clase y una tirada de probabilidad. Si es exitosa, añadir un objeto aleatorio del `lootTable` del NPC al inventario del jugador. |
| **Misiones Clandestinas** | Acceso a un nuevo tipo de misiones con recompensas de `₽` y `Battle Coins` aumentadas (`1.5x` a `2.0x`) y objetos únicos. | Implementar un nuevo módulo de misiones (`js/missions.js` o similar) con una tabla de misiones específicas para el Equipo Rocket. Estas misiones podrían ser `idle` o requerir acciones específicas en el mapa. |
| **Red de Contactos** | Descuentos del `10-25%` en Pokémon raros o con Habilidades Ocultas en tiendas específicas del mercado negro. Aumento del `10-25%` en el precio de venta de Pokémon específicos en el mercado negro. | Implementar una nueva tienda (`js/08_shop.js`) con un `if (player.class === 'Equipo Rocket')` para aplicar descuentos/bonificaciones. |

### Penalización de Rol

| Penalización | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Reputación Negativa con Facciones Legítimas** | Si el jugador del Equipo Rocket utiliza Centros Pokémon o Guarderías más de `X` veces en un período de `Y` horas, o si no realiza misiones clandestinas durante `Z` tiempo, su `costo de servicio` aumenta a `3.0x` y la probabilidad de ser detectado en misiones de robo aumenta en `10%`. | Implementar un contador de acciones legítimas y un temporizador de actividad clandestina en el `state` del jugador. Si se superan los umbrales, aplicar los modificadores negativos a las funciones correspondientes. |

### Mecánica Idle

| Mecánica Idle | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Contrabando Pasivo** | El jugador puede enviar hasta `3` Pokémon de su caja a misiones de contrabando de `2`, `4` u `8` horas. Al finalizar, los Pokémon regresan con `₽ = (NivelPokémon * 50 * MultiplicadorMisión)` y una probabilidad del `5%` de encontrar un `objeto raro` (ej. Caramelo Raro, Master Ball). Existe un `10%` de probabilidad de que la misión sea interceptada, resultando en la pérdida de `50%` de las ganancias y una penalización temporal de `reputación`. | Integrar con el sistema de `daycare_missions` existente (`js/04_state.js`). Crear un nuevo tipo de misión `contrabandMission` con sus propias recompensas y riesgos. Los Pokémon asignados no pueden ser usados en combate durante la misión. |

## 2. Cazabichos

**Concepto:** Una clase optimizada para la captura de Pokémon, con énfasis en la obtención de variantes raras (Shiny, IVs altos) y la eficiencia en la recolección de Pokémon salvajes.

**Mecánicas Técnicas:**

| Mecánica | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Racha de Capturas Perfecta** | Por cada captura consecutiva exitosa (sin escape o huida), se aplica un multiplicador a la `shinyRate` y a la `IVs` de futuros encuentros. `multiplicadorRacha = 1.0 + (0.1 * CapturasConsecutivas)`, hasta un máximo de `3.0`. Este multiplicador se aplica a `GAME_RATIOS.shinyRate` (dividiendo la tasa) y a la probabilidad de IVs altos. Fallar una captura o huir reinicia la racha. | En `js/07_battle.js` (función `catchSuccess`), implementar un contador de `capturasConsecutivas` en el `state` del jugador. En `js/04_state.js` (función `makePokemon`), aplicar `multiplicadorRacha` a `_activeShinyRate` y modificar la generación de IVs para favorecer valores más altos (ej. `Math.floor(Math.random() * 32 * multiplicadorRacha / 3)` para aumentar el promedio). |
| **Sinergia con Tipo Bicho** | Por cada Pokémon de tipo Bicho en el equipo activo: `+5%` a `catchRate` y `-10%` a `fleeRate` del Pokémon salvaje. Máximo `+20%` `catchRate` y `-40%` `fleeRate`. | En `js/07_battle.js`, modificar la fórmula de `catchRate` (`a` en la línea 2152) y la `fleeRate` para incluir un `bonusTipoBicho` basado en el equipo activo del jugador. |
| **Artesanía de Pokéballs Especializadas** | Acceso a recetas para crear Pokéballs con `ballMult` mejorados o efectos adicionales. Ej: `Red Ball Mejorada` con `ballMult = 4.0` para tipos Bicho/Agua. | Implementar un sistema de crafteo (`js/crafting.js` o similar) que permita a los Cazabichos usar materiales para crear Pokéballs mejoradas. Las `ballMult` se aplicarían en `js/07_battle.js`. |
| **Zonas de Caza Privilegiadas** | Acceso a mapas con `encounterRate` aumentado (`1.5x`) y `spawnPool` de Pokémon raros/Bicho. | En `js/06_encounters.js`, modificar la lógica de generación de encuentros para aplicar `encounterRate` y `spawnPool` específicos si el jugador es Cazabichos y está en una zona privilegiada. |

### Penalización de Rol

| Penalización | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Menor Eficiencia en Combate** | Los Pokémon del Cazabichos tienen un `5%` menos de `EXP` ganada en combates contra entrenadores NPC y un `10%` menos de `Battle Coins` obtenidas. | En `js/07_battle.js` (función `awardBattleExperience`), aplicar un multiplicador `0.95` a `pExp` y `0.90` a `Battle Coins` si `player.class === 'Cazabichos'` y el combate es contra un entrenador. |
| **Costos de Curación Aumentados** | Los Centros Pokémon cobran un `1.5x` más por curar Pokémon que no sean de tipo Bicho. | Modificar la función `healPokemon()` en `js/pokecenter.js` para aplicar un multiplicador de costo si el Pokémon no es de tipo Bicho y el jugador es Cazabichos. |

### Mecánica Idle

| Mecánica Idle | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Expediciones de Captura Automática** | El jugador puede enviar hasta `3` Pokémon de tipo Bicho de su caja a una expedición de captura de `1`, `3` o `6` horas. Al finalizar, los Pokémon regresan con `X` Pokémon salvajes capturados (con `IVs` promedio y `1/GAME_RATIOS.shinyRate` de Shiny) y `Y` objetos de captura (ej. Pokéballs, Red Balls). La cantidad de Pokémon y objetos depende del nivel de los Pokémon enviados y la duración de la expedición. | Integrar con el sistema de `daycare_missions` existente (`js/04_state.js`). Crear un nuevo tipo de misión `captureExpedition` que genere Pokémon y objetos en el inventario del jugador. Los Pokémon enviados no pueden ser usados en combate durante la expedición. |

## 3. Entrenador (Clase Base/Tradicional)

**Concepto:** La clase equilibrada, enfocada en la progresión estándar a través de combates, la exploración y la superación de desafíos oficiales. Los Entrenadores buscan el desarrollo óptimo de su equipo y el reconocimiento legítimo.

**Mecánicas Técnicas:**

| Mecánica | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Bonificación de Experiencia por Combate** | Los Pokémon del Entrenador ganan `+10%` de `EXP` en todos los combates. | En `js/07_battle.js` (función `awardBattleExperience`), aplicar un multiplicador `1.1` a `pExp` si `player.class === 'Entrenador'`. |
| **Acceso Prioritario a Desafíos Oficiales** | Descuentos del `20%` en la inscripción a Gimnasios y torneos. Recompensas exclusivas (ítems, `Battle Coins`) al superar desafíos. | En `js/08_shop.js` (o donde se gestionen las inscripciones), aplicar un descuento. En `js/07_battle.js` (al finalizar un combate de gimnasio/torneo), añadir recompensas adicionales. |
| **Entrenamiento Especializado** | Los Centros Pokémon ofrecen un servicio de entrenamiento de EVs con un costo `0.5x` y una eficiencia `1.2x`. | Implementar una nueva función de entrenamiento de EVs en `js/pokecenter.js` o similar, con costos y efectos modificados para la clase Entrenador. |
| **Reputación y Reconocimiento** | Un sistema de `puntosReputacion` que desbloquea tiendas exclusivas y eventos. | Introducir una variable `state.reputation` que se incrementa al ganar combates de gimnasio o torneos. Las tiendas y eventos se habilitarían según el valor de `reputation`. |

### Penalización de Rol

| Penalización | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Costos de Crianza y Captura Elevados** | Los Entrenadores pagan un `1.5x` más por servicios de Guardería y tienen un `10%` menos de probabilidad de éxito de captura en Pokémon con `IVs` superiores a `25`. | Modificar `js/15_breeding.js` para aplicar el multiplicador de costo. En `js/07_battle.js`, reducir la `catchRate` para Pokémon con IVs altos si el jugador es Entrenador. |
| **Menor Ganancia en Mercado Negro** | Si el Entrenador intenta vender Pokémon en el mercado negro, recibe un `50%` menos de `₽` que el valor base. | Modificar la función de venta de Pokémon para aplicar un multiplicador `0.5` si el jugador es Entrenador y vende en el mercado negro. |

### Mecánica Idle

| Mecánica Idle | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Entrenamiento de Gimnasio Pasivo** | El jugador puede enviar hasta `3` Pokémon de su equipo a un entrenamiento de gimnasio de `2`, `4` u `8` horas. Al finalizar, los Pokémon regresan con `EXP = (NivelPokémon * 100 * MultiplicadorEntrenamiento)` y una pequeña probabilidad de aumentar un `EV` aleatorio. | Integrar con el sistema de `daycare_missions` existente (`js/04_state.js`). Crear un nuevo tipo de misión `gymTraining` que otorgue `EXP` y `EVs` a los Pokémon. Los Pokémon enviados no pueden ser usados en combate durante el entrenamiento. |

## 4. Criador Pokémon

**Concepto:** Una clase dedicada a la optimización genética de Pokémon, enfocada en la crianza de individuos con IVs, Habilidades y Movimientos Huevo específicos para el competitivo.

**Mecánicas Técnicas:**

| Mecánica | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Bonificaciones de Crianza Avanzadas** | `Lazo Destino` garantiza `4 IVs` heredados (en lugar de 3). `Habilidad Oculta` se transmite con `75%` de probabilidad (en lugar de `60%`). Reducción del `25%` en `pasosHuevo` para eclosión. | En `js/15_breeding.js`, modificar la lógica de herencia de IVs y Habilidades Ocultas. Ajustar el cálculo de `hatch_ready_time` para reducir el tiempo de eclosión. |
| **Acceso a Guarderías Especializadas** | Opciones para influir en la naturaleza (`Everstone` con `100%` de probabilidad) y asegurar la herencia de `Movimientos Huevo` específicos. | En `js/15_breeding.js`, añadir opciones avanzadas en la interfaz de Guardería que permitan al Criador seleccionar la naturaleza o movimientos huevo a heredar, con un costo asociado. |
| **Mercado de Crías y Genética** | Plataforma para vender/intercambiar Pokémon criados. El precio se basa en `IVs`, `Habilidad`, `Naturaleza` y `reputacionCriador`. | Implementar un nuevo módulo de mercado (`js/breeding_market.js`) que liste los Pokémon del Criador con sus características y un precio calculado dinámicamente. Introducir una variable `state.breederReputation`. |
| **Análisis Genético Avanzado** | Herramienta que revela `IVs` exactos, `Naturaleza` y `Habilidad` de un Pokémon recién capturado/eclosionado sin necesidad de entrenamiento. | Crear una función `analyzePokemonGenetics(pokemon)` que muestre estos datos. Integrarla en la interfaz de la caja o el equipo del jugador, disponible solo para Criadores. |

### Penalización de Rol

| Penalización | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Menor Ganancia de EXP en Combate** | Los Pokémon de los Criadores ganan un `15%` menos de `EXP` en todos los combates. | En `js/07_battle.js` (función `awardBattleExperience`), aplicar un multiplicador `0.85` a `pExp` si `player.class === 'Criador Pokémon'`. |
| **Costos de Curación Elevados** | Los Centros Pokémon cobran un `2.0x` más por curar Pokémon que no sean de su propiedad original (ej. Pokémon intercambiados o robados). | Modificar la función `healPokemon()` en `js/pokecenter.js` para aplicar un multiplicador de costo si el Pokémon no tiene el `originalTrainerID` del jugador y el jugador es Criador. |

### Mecánica Idle

| Mecánica Idle | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Incubación Asistida** | El jugador puede asignar hasta `3` huevos a un proceso de incubación asistida de `4`, `8` o `12` horas. Al finalizar, los huevos tienen una probabilidad aumentada de eclosionar con `IVs` superiores (`+5` a `IVs` aleatorios) o con `Habilidad Oculta` (`+10%` de probabilidad). | Integrar con el sistema de `daycare_missions` existente (`js/04_state.js`). Crear un nuevo tipo de misión `assistedIncubation` que modifique las propiedades de los huevos al eclosionar. |

## 5. Coleccionista Pokémon

**Concepto:** Una clase dedicada a la búsqueda y catalogación exhaustiva de todas las variantes de Pokémon, incluyendo formas raras, Shiny y combinaciones únicas de características.

**Mecánicas Técnicas:**

| Mecánica | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Bonificaciones de Encuentro de Rarezas** | `+20%` a la probabilidad de encontrar Pokémon Shiny (dividiendo `GAME_RATIOS.shinyRate` por `1.2`). `+10%` a la probabilidad de encontrar formas regionales o Pokémon con marcas especiales. | En `js/04_state.js` (función `makePokemon`), aplicar un multiplicador `1.2` a la `shinyRate` si `player.class === 'Coleccionista'`. Introducir una lógica similar para formas regionales/marcas. |
| **Pokédex Expandida y Detallada** | La Pokédex registra variantes (Shiny, formas, marcas) y ofrece recompensas al completar categorías. | Modificar la estructura de `state.pokedex` para almacenar más detalles por Pokémon (ej. `pokedex: { bulbasaur: { caught: true, shiny: true, forms: ['alola'], marks: ['star'] } }`). Implementar un sistema de recompensas basado en la completitud de estas entradas. |
| **Exhibiciones y Concursos de Rarezas** | Eventos donde los Pokémon son valorados por `rareza`, `IVs` y `estética`. Recompensas exclusivas. | Crear un módulo de eventos (`js/contests.js`) donde los Coleccionistas puedan inscribir Pokémon. La puntuación se calcularía en base a `isShiny`, `IVs` (suma total), `form` (si es raro) y `mark`. |
| **Intercambio Especializado** | Plataforma de intercambio global con `50%` de reducción en tarifas de intercambio. Filtros avanzados para buscar Pokémon por `IVs`, `Habilidad`, `Naturaleza`, `Shiny`, `Forma`. | Implementar una interfaz de intercambio (`js/trade.js`) con filtros avanzados y aplicar un descuento a las tarifas de transacción para Coleccionistas. |

### Penalización de Rol

| Penalización | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Menor Eficiencia en Combate** | Los Pokémon de los Coleccionistas ganan un `10%` menos de `EXP` en combates contra entrenadores NPC y un `5%` menos de `Battle Coins` obtenidas. | En `js/07_battle.js` (función `awardBattleExperience`), aplicar un multiplicador `0.90` a `pExp` y `0.95` a `Battle Coins` si `player.class === 'Coleccionista Pokémon'` y el combate es contra un entrenador. |
| **Costos de Curación Elevados** | Los Centros Pokémon cobran un `1.5x` más por curar Pokémon que no sean de su propiedad original (ej. Pokémon intercambiados o robados). | Modificar la función `healPokemon()` en `js/pokecenter.js` para aplicar un multiplicador de costo si el Pokémon no tiene el `originalTrainerID` del jugador y el jugador es Coleccionista. |

### Mecánica Idle

| Mecánica Idle | Descripción Técnica | Implementación Sugerida |
|---|---|---|
| **Búsqueda de Rarezas Pasiva** | El jugador puede enviar hasta `3` Pokémon de su caja a una misión de búsqueda de rarezas de `3`, `6` o `12` horas. Al finalizar, los Pokémon regresan con una pequeña cantidad de `₽` y una probabilidad de encontrar `objetos raros` (ej. Caramelo Raro, Piedras Evolutivas) o incluso un `Pokémon con marca especial` (`0.5%` de probabilidad). | Integrar con el sistema de `daycare_missions` existente (`js/04_state.js`). Crear un nuevo tipo de misión `raritySearch` que genere objetos o Pokémon con marcas especiales en el inventario del jugador. |

---

## Consideraciones Generales para la Implementación:

*   **Gestión de Clases:** Se recomienda añadir una propiedad `player.class` al objeto `state` del jugador (`js/04_state.js`). La elección inicial de clase podría ser un paso en el tutorial o una opción en el menú principal. Un cambio de clase posterior podría implicar un costo significativo en `₽` o `Battle Coins`, o una serie de misiones específicas.
*   **Balance y Progresión:** Es fundamental realizar pruebas exhaustivas para asegurar que los modificadores numéricos (`multiplicadores`, `porcentajes`) de cada clase estén equilibrados y que la progresión de clase (desbloqueo de habilidades o mejora de bonificaciones con el nivel de clase) sea gratificante. El `trainerLevel` y `trainerExp` existentes en `js/04_state.js` podrían adaptarse para representar el nivel de la clase.
*   **Interfaz de Usuario (UI):** Cada clase podría tener elementos UI distintivos o secciones de menú exclusivas (ej. un botón para 
Misiones Clandestinas para el Equipo Rocket, o un panel de Racha de Capturas para el Cazabichos). Esto reforzará la identidad de cada rol y proporcionará una experiencia de usuario más inmersiva.
*   **Misiones Idle:** Para las clases que se benefician de misiones (como el Equipo Rocket), se puede implementar un sistema de misiones idle donde el jugador asigna Pokémon o recursos a una tarea y, después de un tiempo, recibe recompensas. Esto podría integrarse con el sistema de `daycare_missions` existente en `js/04_state.js`.

Este enfoque técnico busca proporcionar una base sólida para la implementación de las clases, permitiendo una integración más fluida con la lógica de juego existente y ofreciendo una experiencia de juego rica y variada para los jugadores.
