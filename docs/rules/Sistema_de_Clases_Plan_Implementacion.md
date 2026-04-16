# 🎭 Sistema de Clases — Plan de Implementación
>
> PokeBorrador · Diseño final balanceado + hoja de ruta técnica paso a paso

---

## 📋 Resumen del Diseño Final

Se implementarán **4 clases**. Se eliminó "Coleccionista" porque solapaba demasiado con Cazabichos (ambas giraban en torno a rarezas/Shiny). En su lugar, el Cazabichos absorbe el elemento de rareza y se distingue por el **gameplay activo en campo**, mientras que el Criador domina el **meta offline y genético**.

Cada clase tiene:

- 1 mecánica principal activa (lo que la hace única en combate/campo)
- 1 mecánica de mercado/economía
- 1 mecánica idle (usando el sistema daycare_missions existente)
- 1–2 penalizaciones claras y temáticas

La clase se elige al alcanzar **Nivel de Entrenador 5** (primer hito real del juego). Cambiar de clase cuesta **500 Battle Coins** y reinicia el progreso de clase (classXP).

---

## ⚖️ Las 4 Clases Balanceadas

---

### 1. 🚀 Equipo Rocket — "El Mercader de Sombras"

**Identidad**: Dinero fácil, alto riesgo. Domina la economía pero vive al margen de la ley.

#### ✅ Ventajas

| Mecánica | Descripción | Valor Numérico |
|---|---|---|
| **Mercado Negro** | Puede vender Pokémon de la caja directamente por dinero | `₽ = nivel * 50 + (IV_total / 186) * 500` |
| **Robo Rápido** | Al inicio de batalla contra NPC entrenador, chance de robar 1 ítem | `prob = 0.15 + (classLevel * 0.01)`, máx `0.30` |
| **Precio Preferencial** | Descuento del 20% en ítems del mercado negro exclusivo | Multiplicador `0.80` en black market |
| **Contrabando Pasivo (Idle)** | Envía hasta 3 Pokémon a misiones de 2/4/8h | `₽ = nivelPokémon * 50 * mult`, 5% objeto raro, 10% intercepción (pierde 50% ganancias) |

#### ❌ Penalizaciones

| Penalización | Valor |
|---|---|
| Centro Pokémon cuesta el doble | Multiplicador `2.0x` fijo (no escalante, más predecible) |
| -10% Battle Coins en todas las batallas | Multiplicador `0.90` a `battleCoins` ganadas |
| No puede participar en torneos oficiales | Acceso bloqueado a `gymBattle` (si aplica en el futuro) |

#### 🧮 Balance racional

El Rocket gana mucho dinero pero lo gasta igual de rápido (curación cara). Puede escalar vendiendo Pokémon que otras clases guardarían. Su idle es el más rentable pero con riesgo real (10% de pérdida). No puede farmear Battle Coins eficientemente, lo que lo aleja del meta competitivo.

---

### 2. 🦗 Cazabichos — "El Maestro de la Captura"

**Identidad**: Encuentra lo que nadie más puede encontrar. Vive en el campo.

#### ✅ Ventajas

| Mecánica | Descripción | Valor Numérico |
|---|---|---|
| **Racha de Capturas** | Capturas consecutivas sin fallar ni huir acumulan multiplicador | `mult = 1.0 + (0.15 * racha)`, máx `3.0x`. Aplica a shinyRate (divide) y a IVs mínimos (`floor(IV_min + racha * 2)`, máx 20) |
| **Sinergia Bicho** | Por cada Pokémon tipo Bicho en el equipo activo | `+5% catchRate`, `-10% fleeRate`. Máx `+20%` y `-40%` respectivamente |
| **Zonas Privilegiadas** | En zonas marcadas, tasa de encuentros aumentada y pool expandido | `1.5x encounterRate`, acceso a Pokémon raros del pool exclusivo |
| **Expedición de Captura (Idle)** | Envía hasta 3 Pokémon a expediciones de 1/3/6h | Regresan con 1–4 Pokémon capturados (IVs aleatorios, shiny a tasa normal/racha) + objetos de captura |

#### ❌ Penalizaciones

| Penalización | Valor |
|---|---|
| -20% EXP en batallas contra entrenadores NPC | Multiplicador `0.80` a `pExp` vs trainers |
| -15% Battle Coins en todas las batallas | Multiplicador `0.85` a `battleCoins` |
| Guardería cuesta 1.5x más | Multiplicador `1.5x` en costos de daycare |

#### 🧮 Balance racional

La racha de capturas es muy poderosa (Shiny potencialmente 3x más probable), pero fallar una captura la reinicia — crear tensión real. Sus penalizaciones de combate son significativas porque si va a tener las mejores capturas del server, no puede también ser el mejor en batalla. La guardería cara lo separa del rol del Criador.

---

### 3. 🏅 Entrenador — "El Campeón Legítimo"

**Identidad**: El más fuerte en combate. Sube de nivel más rápido y domina los desafíos oficiales.

#### ✅ Ventajas

| Mecánica | Descripción | Valor Numérico |
|---|---|---|
| **Bonificación de EXP** | Todos los Pokémon ganan más EXP en combate | `+10%` a `pExp` en toda batalla → multiplicador `1.10` |
| **Maestría en Gimnasios** | Más Battle Coins y un ítem exclusivo al ganar contra líderes de gimnasio | `+30%` BC en batallas de gimnasio + drop de ítem especial |
| **Entrenamiento de EVs** | El Centro Pokémon ofrece entrenamiento de EVs a mitad de precio | Costo `0.5x`, eficiencia `1.2x` (requiere UI nueva) |
| **Sistema de Reputación** | Ganar batallas de gym acumula `reputationPoints` que desbloquean tienda exclusiva | `+10 pts` por gym ganado. Tienda se desbloquea a 50/100/200 pts |
| **Entrenamiento de Gimnasio (Idle)** | Envía hasta 3 Pokémon a entrenar 2/4/8h | `EXP = nivelPokémon * 100 * mult` + pequeña probabilidad de EV aleatorio |

#### ❌ Penalizaciones

| Penalización | Valor |
|---|---|
| -10% catchRate en Pokémon con IV total > 120 (aprox. 20+ por stat) | Reduce `a` en la fórmula de captura |
| Guardería cuesta 1.5x más | Multiplicador `1.5x` en costos de daycare |
| Mercado Negro deshabilitado | No puede vender Pokémon ni acceder a la tienda del Rocket |

#### 🧮 Balance racional

El Entrenador es la clase más fuerte en PvP y progresión de historia. Sus penalizaciones lo alejan de la colección y la crianza — no puede tenerlo todo. La tienda de Reputación le da un objetivo a largo plazo único que ninguna otra clase tiene. La guardería cara lo diferencia del Criador.

---

### 4. 🧬 Criador Pokémon — "El Maestro Genético"

**Identidad**: Sus Pokémon nacen perfectos. Domina el meta competitivo desde la guardería.

#### ✅ Ventajas

| Mecánica | Descripción | Valor Numérico |
|---|---|---|
| **Herencia Élite** | Lazo Destino transmite 4 IVs (vs 3 normal). Habilidad Oculta: 75% (vs 60%) | Modifica `calculateInheritance()` en `15_breeding.js` |
| **Incubación Acelerada** | -25% en tiempo de eclosión de huevos | Ajustar `hatch_ready_time` con multiplicador `0.75` |
| **Everstone Garantizada** | La Piedra Eterna funciona con 100% de garantía (vs probabilidad base) | Condicional en `calculateInheritance()` |
| **Análisis Genético** | Puede ver IVs exactos, naturaleza y habilidad de cualquier Pokémon desde la caja | Nueva función `analyzePokemonGenetics()` con UI en la caja |
| **Mercado de Crías (Idle)** | Pone Pokémon criados en venta automática con precio calculado por estadísticas | `precio = (IV_total/186) * 2000 + (isHA ? 500 : 0)` en moneda del juego |
| **Incubación Asistida (Idle)** | Asigna hasta 3 huevos a incubación de 4/8/12h | Al eclosionar: +5 a IVs aleatorios, +10% prob. Habilidad Oculta |

#### ❌ Penalizaciones

| Penalización | Valor |
|---|---|
| -10% EXP en todos los combates | Multiplicador `0.90` a `pExp` |
| Centro Pokémon cuesta 1.5x para Pokémon que no nacieron con él | Verifica `originalTrainer` del Pokémon |
| No puede usar el Mercado Negro | Sin acceso a venta rápida por dinero del Rocket |

#### 🧮 Balance racional

El Criador produce los mejores Pokémon del juego en términos de IVs/Habilidades — eso es enormemente poderoso en el largo plazo. A cambio, pelea peor y cura más caro. Su idle de mercado es único: en lugar de generar dinero directamente, genera Pokémon valiosos que otros jugadores comprarán. Esto crea interdependencia entre clases.

---

## 🛠️ Hoja de Ruta Técnica — Pasos de Implementación

### FASE 1 — Infraestructura Base (src/legacy/js/04_state.js)

**Objetivo**: Añadir la estructura de clases al estado del juego sin romper nada.

**Paso 1.1** — Añadir al `INITIAL_STATE`:

```javascript
playerClass: null,           // 'rocket' | 'cazabichos' | 'entrenador' | 'criador'
classLevel: 1,               // Nivel dentro de la clase (1-10)
classXP: 0,                  // XP acumulada en la clase
classData: {
  // Rocket
  blackMarketSales: 0,
  lastClandestineActivity: null,
  // Cazabichos
  captureStreak: 0,
  longestStreak: 0,
  // Entrenador
  reputationPoints: 0,
  // Criador (sin datos extra por ahora)
}
```

**Paso 1.2** — Añadir función helper `getClassModifier(type)`:

```javascript
function getClassModifier(type) {
  // Devuelve el multiplicador correspondiente para la clase activa
  // type: 'expMult' | 'catchMult' | 'healCost' | 'daycareCost' | 'bcMult'
}
```

**Paso 1.3** — Crear `src/legacy/js/20_classes.js` con:

- `CLASSES` objeto con definiciones de cada clase
- `selectClass(classId)` — función para elegir/cambiar clase
- `getClassBonuses()` — devuelve bonificaciones activas
- `addClassXP(amount)` — progresión de nivel de clase

---

### FASE 2 — Selector de Clase (UI en index.html + src/legacy/js/20_classes.js)

**Objetivo**: El jugador puede elegir su clase al llegar a Nivel 5.

**Paso 2.1** — Crear modal `#class-selection-modal` en `index.html`:

- Se abre automáticamente cuando `trainerLevel >= 5 && !state.playerClass`
- Muestra las 4 clases con descripción, ventajas y penalizaciones
- Botón de confirmación con advertencia "esta decisión es permanente (cambio cuesta 500 BC)"

**Paso 2.2** — Añadir indicador de clase activa en el HUD principal:

- Pequeño badge con icono + nombre de clase debajo del nombre del entrenador
- Barra de progreso de `classXP`

---

### FASE 3 — Modificadores de Combate y Experiencia (src/legacy/js/07_battle.js)

**Objetivo**: Aplicar multiplicadores de clase en los puntos críticos del combate.

**Paso 3.1** — En la función de reparto de EXP (`awardBattleExperience` o equivalente):

```javascript
const expMult = getClassModifier('expMult');  // Entrenador 1.10 | Criador 0.90 | resto 1.0
pExp = Math.floor(pExp * expMult);
```

**Paso 3.2** — En el reparto de Battle Coins:

```javascript
const bcMult = getClassModifier('bcMult');  // Entrenador gym 1.30 | Rocket 0.90 | Cazabichos 0.85
battleCoinsEarned = Math.floor(battleCoinsEarned * bcMult);
```

**Paso 3.3** — Mecánica de Robo Rápido del Rocket:

- Al inicio de `startBattle()` contra NPC entrenador: tirada de probabilidad
- Si éxito → añadir ítem al inventario + mostrar mensaje "¡Robaste X al entrenador!"

**Paso 3.4** — Ajuste de catchRate del Entrenador:

- En la fórmula de captura: si `playerClass === 'entrenador'` y IV_total del Pokémon objetivo > 120, aplicar multiplicador `0.90` a `catchRate`

---

### FASE 4 — Modificadores de Captura (src/legacy/js/06_encounters.js)

**Objetivo**: Implementar la Racha de Capturas y Zonas Privilegiadas del Cazabichos.

**Paso 4.1** — Al capturar exitosamente un Pokémon:

```javascript
if (state.playerClass === 'cazabichos') {
  state.classData.captureStreak++;
  // Actualizar longestStreak si aplica
}
```

**Paso 4.2** — Al fallar captura o huir:

```javascript
if (state.playerClass === 'cazabichos') {
  state.classData.captureStreak = 0;
}
```

**Paso 4.3** — En `makePokemon()`, aplicar multiplicador de racha:

```javascript
if (state.playerClass === 'cazabichos' && state.classData.captureStreak > 0) {
  const streakMult = Math.min(1.0 + 0.15 * state.classData.captureStreak, 3.0);
  _activeShinyRate = Math.floor(_activeShinyRate / streakMult);
  ivFloor = Math.min(20, Math.floor(state.classData.captureStreak * 2));
}
```

**Paso 4.4** — Bonus de Sinergia Bicho:

- Contar Pokémon tipo Bicho en `state.team`
- Aplicar modificadores a `catchRate` y `fleeRate` en el combate

---

### FASE 5 — Centro Pokémon y Guardería (src/legacy/js/08_shop.js + src/legacy/js/15_breeding.js)

**Objetivo**: Aplicar costos diferenciales por clase.

**Paso 5.1** — En la función de curación (`healAllPokemon` o similar):

```javascript
const healCostMult = getClassModifier('healCost');
// Rocket: 2.0 | Criador: 1.5 si originalTrainer !== state.uid | resto: 1.0
const totalCost = baseCost * healCostMult;
if (state.money < totalCost) { /* mostrar error */ return; }
state.money -= totalCost;
```

**Paso 5.2** — En guardería / daycare (`15_breeding.js`):

```javascript
const daycareCostMult = getClassModifier('daycareCost');
// Entrenador y Cazabichos: 1.5 | resto: 1.0
```

**Paso 5.3** — Modificaciones del Criador en `calculateInheritance()`:

- Si `playerClass === 'criador'` y se usa Lazo Destino: heredar 4 IVs en lugar de 3
- Si `playerClass === 'criador'`: probabilidad de Habilidad Oculta = 75% (vs 60%)
- Si `playerClass === 'criador'` y se usa Everstone: garantizar 100% de herencia de naturaleza
- Tiempo de eclosión: `hatch_ready_time *= 0.75`

---

### FASE 6 — Mercado Negro del Rocket (src/legacy/js/08_shop.js o nuevo src/legacy/js/20_classes.js)

**Objetivo**: El Rocket puede vender Pokémon de la caja por dinero.

**Paso 6.1** — Nueva sección en la UI de la caja (si `playerClass === 'rocket'`):

- Botón "Vender" junto a cada Pokémon en la caja
- Precio calculado: `₽ = nivel * 50 + (IV_total / 186) * 500`
- Confirmar con modal ("¿Seguro? Esta acción es irreversible")

**Paso 6.2** — Tienda del Mercado Negro (exclusiva Rocket):

- Lista de ítems raros a precio `0.80x` del valor normal
- Accesible desde el menú principal con badge "Rocket"

---

### FASE 7 — Sistema Idle de Clases (src/legacy/js/04_state.js o src/legacy/js/20_classes.js)

**Objetivo**: Añadir los 4 tipos de misiones idle usando el sistema daycare_missions existente.

**Paso 7.1** — Extender `daycare_missions` con nuevos tipos:

```javascript
// Tipo: 'contrabando' (Rocket)
// Tipo: 'captureExpedition' (Cazabichos)
// Tipo: 'gymTraining' (Entrenador)
// Tipo: 'assistedIncubation' (Criador)
```

**Paso 7.2** — En `processOfflineMissions()` (o el equivalente que ya existe), añadir procesamiento para cada nuevo tipo:

- **contrabando**: calcular `₽`, tirar 10% intercepción, tirar 5% objeto raro
- **captureExpedition**: generar 1-4 Pokémon salvajes con `makePokemon()`, generar ítems de captura
- **gymTraining**: calcular EXP y añadirla a los Pokémon enviados, pequeña probabilidad de EV
- **assistedIncubation**: modificar IVs de huevos en +5, +10% HA al eclosionar

**Paso 7.3** — UI de misiones idle por clase:

- Panel accesible desde el menú de clase
- Mostrar slots de Pokémon disponibles, duración y recompensas esperadas
- Temporizador visual de retorno

---

### FASE 8 — Análisis Genético del Criador (src/legacy/js/12_box_bag.js)

**Objetivo**: El Criador puede ver IVs exactos desde la caja.

**Paso 8.1** — Añadir opción "Analizar" al menú de Pokémon en la caja (solo si `playerClass === 'criador'`):

- Modal que muestra: IVs exactos por stat, Naturaleza, Habilidad (con flag de si es Oculta)
- Calcular valor estimado de venta

---

### FASE 9 — Reputación del Entrenador (src/legacy/js/07_battle.js + src/legacy/js/08_shop.js)

**Objetivo**: Sistema de Reputación con tienda exclusiva.

**Paso 9.1** — En `endBattle()` contra gimnasio/líder: `state.classData.reputationPoints += 10`

**Paso 9.2** — Nueva tienda de Reputación en `08_shop.js`:

- Desbloquea a 50 / 100 / 200 puntos
- Ítems exclusivos: TMs raros, ítems de EV, objetos para mejorar estadísticas

---

### FASE 10 — Pulido y Balance (transversal)

**Objetivo**: Asegurarse de que todo funciona bien junto.

**Paso 10.1** — Añadir `classXP` a todas las acciones relevantes:

- Rocket gana classXP vendiendo Pokémon y completando contrabandos
- Cazabichos gana classXP por rachas de captura y expediciones
- Entrenador gana classXP por victorias en gimnasios y puntos de reputación
- Criador gana classXP por huevos eclosionados y ventas en el mercado de crías

**Paso 10.2** — Niveles de clase 1-10 con pequeñas mejoras progresivas:

- Cada 2 niveles de clase, mejorar ligeramente el modificador principal
- Ejemplo Cazabichos: classLevel 1 → streakMult máx 3.0 / classLevel 5 → máx 4.0

**Paso 10.3** — Feedback visual:

- Mensaje al acumular racha de capturas ("¡Racha x5! +75% Shiny Rate")
- Notificación al robar ítem como Rocket
- Indicador de reputación actual en el HUD del Entrenador

---

## 📁 Archivos a Crear / Modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `src/legacy/js/04_state.js` | Modificar | Añadir campos de clase al INITIAL_STATE |
| `src/legacy/js/07_battle.js` | Modificar | EXP/BC multipliers, Robo Rápido, catchRate ajustes |
| `src/legacy/js/06_encounters.js` | Modificar | Racha de capturas, Zonas Privilegiadas |
| `src/legacy/js/08_shop.js` | Modificar | Costos de curación, Mercado Negro, tienda Reputación |
| `src/legacy/js/15_breeding.js` | Modificar | Herencia Élite, Everstone 100%, tiempo eclosión |
| `src/legacy/js/12_box_bag.js` | Modificar | Análisis Genético del Criador |
| `src/legacy/js/20_classes.js` | **Crear** | Motor principal del sistema de clases |
| `index.html` | Modificar | Modal de selección, HUD badge, paneles de clase |

---

## 🚦 Orden de Implementación Recomendado

```
FASE 1 (Base de datos de clases)
    ↓
FASE 2 (UI de selección — para poder probar)
    ↓
FASE 3 + 4 (Combate y captura — el núcleo del gameplay)
    ↓
FASE 5 (Economía de servicios)
    ↓
FASE 6 (Mercado Negro — requiere FASE 5)
    ↓
FASE 7 (Idle — requiere FASES 1, 5)
    ↓
FASE 8 + 9 (Features específicas Criador y Entrenador)
    ↓
FASE 10 (Pulido y classXP)
```

---

## ⚠️ Notas de Balance para Revisión Post-Implementación

1. **Racha de Capturas**: Si el x3.0 de Shiny resulta demasiado poderoso en las primeras semanas, reducir el cap a x2.0 y ajustar gradualmente.
2. **Costo de curación del Rocket**: Si los jugadores sienten que 2x es injugable al inicio, añadir un "pase de cortesía" de 3 curaciones gratuitas por día.
3. **Reputación del Entrenador**: Asegurarse de que los ítems de la tienda de Reputación sean deseables para las otras clases pero solo accesibles para Entrenadores — si no son atractivos, el sistema pierde sentido.
4. **Mercado de Crías del Criador**: El precio automático necesita pruebas reales de economía. Ajustar la fórmula según cuánto dinero genera vs. cuánto gana un Rocket con contrabando en el mismo tiempo.
