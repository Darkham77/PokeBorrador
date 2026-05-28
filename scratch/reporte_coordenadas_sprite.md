# Reporte de Coordenadas de Sprite y Rendimiento en Combate

Este reporte detalla cómo se calculan las coordenadas de los sprites de los Pokémon en combate, dónde ocurren estos cálculos, qué parámetros se obtienen y el impacto en el rendimiento del juego.

---

## 🔍 1. ¿Qué coordenadas se calculan y para qué sirven?

Durante el inicio y el transcurso de un combate, se escanean los sprites de los Pokémon para calcular dinámicamente dos coordenadas clave de anclaje:

1. **Punto de Apoyo (Pies / Ground Anchors - `feetY`, `feetX`)**:
   - **`feetY`**: Representa la posición vertical del primer píxel sólido (no transparente) de abajo hacia arriba del sprite del Pokémon, normalizado como un porcentaje (entre `0` y `1`) con respecto a la altura total de la imagen.
   - **`feetX`**: Representa el centro horizontal de la caja de colisión (bounding box) del Pokémon. Se calcula como el promedio entre el píxel sólido más a la izquierda (`minX`) y el más a la derecha (`maxX`).
   - **Propósito**: Define la posición exacta del suelo para que las sombras, las Poké Balls de captura, los rayos de energía y otros efectos visuales se alineen perfectamente con la base física del sprite del Pokémon (evitando que "floten" o queden desalineados, especialmente en Pokémon de diferentes tamaños o alturas).

2. **Caché y Exclusión de Flotantes (Voladores - `isFlying`)**:
   - Para las especies con la propiedad `isFloating` activa o que poseen el tipo `flying` (Volador), se omite el punto calculado por escaneo de píxeles y se fuerza el anclaje vertical a `0.9` (90% del contenedor), asegurando que los efectos ambientales y las Poké Balls caigan al suelo en lugar de levitar.

---

## 🛠️ 2. ¿Dónde se realizan estos cálculos en el código?

Los cálculos de coordenadas residen principalmente en dos archivos clave del sistema:

### A. [`combatShadows.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/combatShadows.ts) (Pinia Store)

Este archivo maneja la lógica de análisis del sprite del Pokémon mediante Canvas 2D en la función `detectFeetPoints(url)`:

- **Carga del Sprite**: Crea un objeto `new Image()` y espera a que el recurso cargue.
- **Creación de Canvas Offscreen**: Instancia un elemento `<canvas>` temporal en memoria del mismo tamaño que la imagen.
- **Lectura de Píxeles (`getImageData`)**: Extrae la información de color de cada píxel utilizando `ctx.getImageData()`.
- **Bucle de Escaneo**: Recorre toda la matriz de píxeles buscando aquellos cuyo canal alfa (`alpha > 50`) sea sólido.
  - Encuentra el valor más bajo verticalmente (`lowestY`) para determinar el nivel de los pies.
  - Registra el límite izquierdo (`minX`) y derecho (`maxX`) para determinar el centro horizontal (`centerX`).
- **Almacenamiento en Caché**: Guarda el resultado en `feetCache` (`Map<string, FeetPoints>`) indexado por la URL del sprite.

### B. [`useBattleShadows.ts`](file:///home/franco/Trabajos/PokeBorrador/src/composables/useBattleShadows.ts) (Vue Composable)

- Administra el ciclo de vida y la sincronización de las coordenadas en los componentes de la vista del combate (`BattleArenaView.vue` y `BattleCombatant.vue`).
- Coordina la precarga de coordenadas a través de la función `preloadCombatCoords()`.

---

## ⚡ 3. Impacto en el Rendimiento

El análisis de píxeles en sprites a nivel de CPU/Canvas puede provocar caídas de frames (jank/micro-stuttering) debido a:

1. **Llamadas a `getImageData`**: Fuerza una lectura directa de la GPU a la memoria de la CPU, bloqueando momentáneamente el hilo principal de renderizado (Thread de UI).
2. **Ciclo Anidado de Escaneo**: Procesar miles de píxeles secuencialmente (`width * height`) en JavaScript consume tiempo de cómputo síncrono.

### 🛡️ Medidas de Mitigación Implementadas

- **Precarga en Segundo Plano (`preloadCombatCoords`)**: Durante el estado `INITIALIZING` de la máquina de estados de combate (antes de iniciar la animación de encuentro o entrar a la fase de búsqueda), se pre-cargan los puntos de pies de **todos** los Pokémon del equipo del jugador y del enemigo de forma paralela mediante `Promise.all`. Esto evita hacer el cálculo pesado síncronamente cuando el Pokémon aparece en pantalla.
- **Caché Persistente (`feetCache`)**: Una vez escaneado un sprite, el resultado se almacena de forma indefinida en la sesión. Posteriores renderizados o combates con la misma especie acceden a los datos de manera inmediata (O(1)), eliminando por completo el reprocesamiento del canvas.
- **Exclusión de Voladores**: Los Pokémon voladores evitan la llamada y el escaneo de píxeles al usar valores fijos predeterminados (`0.9`).
