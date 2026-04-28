# Manual de Mecánicas y UX de Juego (Poké Vicio)

Este manual detalla las convenciones de diseño y reglas de interacción específicas que definen la experiencia de usuario en Poké Vicio.

## 🕹️ Interacción y Selección

### 1. Paridad de Selección en Slots

Todo slot que muestre un miembro de un equipo (Aventura, PVP, Guerra) DEBE permitir la interacción de **"REEMPLAZAR"** (Swap) directamente.

- **Regla**: No obligues al usuario a quitar un Pokémon para poner otro. Provee un botón de cambio (🔄) que abra el selector.
- **Patrón**: El selector debe recibir un callback que maneje el intercambio atómico de UIDs.

### 2. Ordenamiento y DND (Drag-and-Drop)

- **Visual Feedback**: Durante el reordenamiento, muestra números pixelados grandes (1-6) sobre los slots para indicar la posición final.
- **Interferencia de Tooltips**: Desactiva (`disabled`) los `PVTooltip` durante el arrastre para evitar que bloqueen la zona de drop.
- **Persistencia Silenciosa**: Dispara un guardado automático (`save(false)`) tras cada operación de reordenamiento exitosa.

---

## 🎨 Estándares de Interfaz (Hybrid Retro-Modern)

### 1. Jerarquía de Badges y Tags

- **Independencia Semántica**: No anides badges de Género y Nivel. Usa contenedores flex dedicados para que mantengan sus bordes y mixins independientes.
- **Pills de Tipo**: Nombres largos (ej. "LUCHA") deben usar `width: auto` y `min-width` para evitar recortes en el pill.

### 2. Visibilidad y Filtros

- **Siluetas Nocturnas**: En entornos oscuros, los Pokémon desconocidos deben usar el mixin `pokemon-silhouette` con un borde blanco al 50% para contraste.
- **Emojis de Horario**: Usa emojis (🌅, ☀️, 🌇, 🌙) en los tooltips de spawn para ahorrar espacio y mantener la estética retro.
- **Spoiler Shield**: Oculta horarios específicos para Pokémon no capturados/vistos.

---

## ⚙️ Lógica del Motor (Vue + Phaser Bridge)

### 1. Estabilización de Carga

- El `BootScene` debe tener un delay mínimo (ej. 500ms) antes de señalar readiness. Esto asegura que el mensaje de carga sea legible y el navegador procese los atlas.
- **Fondo Negro**: Durante la carga, el fondo de `App.vue` debe ser negro absoluto (`var(--darker)`) para evitar parpadeos visuales.

### 2. Prevención de Crashes en Callbacks

Cualquier `setTimeout` o `Promise` dentro de una escena de Phaser debe verificar la existencia de la escena antes de actuar:

```js
setTimeout(() => {
  if (!this.scene || !this.scene.manager || this.game?.pendingDestroy) return;
  // Lógica...
}, delay);

---

## 🐣 Sistema de Crianza (Daycare)

### 1. Compatibilidad
- **Ditto**: Compatible con cualquier especie excepto Legendarios y grupo "No-Eggs".
- **Especie Resultante**: Siempre es la evolución base (o "Baby") de la **Madre**.
- **Restricción**: Los Legendarios (`mewtwo`, `mew`, `articuno`, `zapdos`, `moltres`) no pueden criar.

### 2. Herencia de IVs
- **Base**: Se heredan 3 IVs aleatorios de los padres (4 si el jugador tiene la clase **Criador**).
- **Power Items**: Forzan la herencia de un stat específico:
  - **Pesa Recia**: HP
  - **Brazal Recio**: Ataque
  - **Cinto Recio**: Defensa
  - **Lente Recia**: At. Especial
  - **Banda Recia**: Def. Especial
  - **Franja Recia**: Velocidad
- **Piedra Eterna**: Si un padre la lleva, bloquea su evolución y (opcionalmente en futuras versiones) hereda la Naturaleza.

### 3. Costos de Crianza
El costo en PokéDólares escala según la cantidad de IVs perfectos (30 o 31) que posean los padres en total:
- **0-2 IVs**: $2,000
- **3-5 IVs**: $5,000
- **6-8 IVs**: $12,000
- **9-11 IVs**: $25,000
---

## 🦄 Sistemas de Encuentros

### 1. Tipos de Encuentro
- **Salvaje (Wild)**: Probabilidad base según la ruta.
- **Entrenador (Trainer)**: Aparecen según un temporizador de "Pity" que aumenta un 5% cada 2 minutos (máx 20%).
- **Pesca (Fishing)**: Solo en rutas con agua, 10% de probabilidad base.
- **Defensores (Fase de Dominancia)**: 20% de probabilidad de encontrar un defensor de la facción enemiga en mapas dominados durante el fin de semana.

### 2. Guardianes (Pokémon Alfa)
- **Aparición**: 1% de probabilidad en mapas en disputa.
- **Límite**: Solo 1 captura de guardián por mapa al día.

### 3. Repelentes e Inciensos
- **Repelente**: Bloquea encuentros salvajes cuyos niveles sean menores al primer Pokémon del equipo. Aumenta la probabilidad de Entrenadores al 30%.
- **Incienso**: Filtra el pool de encuentros de la ruta para favorecer un **tipo elemental** específico.

---

## 🧬 Lógica de Evolución

### 1. Evolución por Nivel
- **Estándar**: Se activa al alcanzar el nivel definido en `evolutionData.js`.
- **Tyrogue**: Evoluciona al nivel 20 basándose en sus stats: Atk > Def (**Hitmonlee**), Def > Atk (**Hitmonchan**), Empate (50/50).

### 2. Evolución en Estado Salvaje (Auto-Evo)
Cuando el sistema genera un Pokémon salvaje de nivel alto, aplica un proceso de evolución automática:
- **Piedras/Intercambio**: 50% de probabilidad de evolucionar si el nivel es >= 30 (piedra) o >= 32 (intercambio).

### 3. Piedras Evolutivas
- **Eevee**: Requiere Piedra Agua (Vaporeon), Piedra Trueno (Jolteon) o Piedra Fuego (Flareon).

El sistema utiliza dos flags independientes computados desde el estado de la Pokédex:

1.  **isSeen**: `seenPokedex.includes(id)`. Revela nombre y tipos en tooltips.
2.  **isCaught**: `pokedex.includes(id)`. Muestra el sprite real.
3.  **Silueta**: Los Pokémon no vistos (`isSeen = false`) muestran una silueta negra sólida en el mapa para fomentar la exploración. En la Pokédex, se muestran como `???`.

---

## 🌞 Ciclo de Tiempo y Estaciones

- **Velocidad**: 1 día real (24h) equivale a **3 días en el juego** (ciclos de 8h).
- **Fases (2h cada una)**: Mañana, Día, Tarde, Noche.
- **Estaciones**: Cambian cada **Semana Real** (7 días) en secuencia: Primavera -> Verano -> Otoño -> Invierno.
- **Sincronización**: Basada estrictamente en *Epoch Time* continuo para garantizar paridad entre todos los jugadores sin consultar la DB.

---

## ⚡ Visibilidad y Performance (Lean Rendering)

Durante escenas de alta carga (ej. Combates), se aplica el protocolo de ocultación:
- **v-if**: Elementos no esenciales (MapCards, NPCs, animaciones de clima del fondo) DEBEN ocultarse físicamente.
- **Pause**: Todos los intervalos de JS (clima, buffs) deben pausarse mientras el estado de combate esté activo.
```
