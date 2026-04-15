# 🥚 Sistema de Huevos

## Tipos de huevos

| Tipo | Origen | Límite | Pasos |
|---|---|---|---|
| Huevo de Encuentro | 5% al derrotar entrenador NPC | 1 a la vez | 150–300 |
| Huevo de Crianza | Guardería con pareja compatible | 1 a la vez | 150–300 |

---

## Ciclo de vida de un huevo

```
Creación (addEgg)
    │
    ├── steps: random entre 150 y 300
    ├── totalSteps: mismo valor (para calcular %)
    └── ready: false
         │
    Cada click en goLocation() → hatchEggs() → steps--
         │
    Cuando steps <= 0 → ready = true
         │
         → Notificación: "¡Un Huevo Pokémon está listo!"
         │
    startManualHatch(eggIdx)
         │
         → Overlay con huevo gigante
         → 5–7 clicks para romper
         │
    performHatchRevelation(eggIdx)
         │
         → makePokemon(pokemonId, 5)
         → Sobreescribir IVs si es huevo de crianza
         → Agregar al equipo (o caja)
         → Remover el huevo de state.eggs
```

---

## Pool de Pokémon en huevos de encuentro

Los huevos de encuentro se obtienen al derrotar entrenadores NPC con 5% de probabilidad. La especie es aleatoria del siguiente pool:

```javascript
['pichu', 'magby', 'elekid', 'cleffa', 'igglybuff', 'togepi', 'eevee']
```

Son todos **Pokémon bebé** o difíciles de conseguir de otra forma.

---

## Progresión visual en el perfil

Cada huevo muestra una barra de progreso:

```javascript
const progress = Math.min(100, Math.max(0, ((total - egg.steps) / total) * 100));
```

- Barra color **amarillo** para huevos de encuentro
- Barra color **morado** para huevos de crianza
- Al estar listo: animación `pulseGlow` y botón para eclosionar

---

## Animación de eclosión manual

1. Se muestra un overlay con el huevo animado (120px)
2. El jugador hace click entre 5 y 7 veces (`totalClicks = 5 + floor(random × 3)`)
3. Cada click sacude el huevo y la pantalla
4. Tras el último click: flash de luz, aparece el Pokémon
5. Se muestran sus IVs (para huevos de crianza, los IVs heredados)

---

## Procesamiento de huevos de crianza offline

Al iniciar sesión online, la función `processOfflineBreeding(userId)` verifica el tiempo transcurrido desde la última conexión y genera automáticamente los huevos de crianza que correspondan.

```javascript
// Lógica aproximada:
const elapsed = Date.now() - lastSaveTimestamp;
const interval = EGG_SPAWN_INTERVAL_MS[compat.level];
if (elapsed >= interval && state.eggs.filter(e => e.origin === 'breeding').length < 1) {
  addEgg(eggSpecies, 'breeding', inheritanceData);
}
```

Esto permite que los jugadores "cultiven" huevos mientras duermen o están desconectados.

---

## Reducción de pasos por captura (online)

```javascript
function reduceHatchTimer(userId, action) {
  // Al capturar un Pokémon online, reduce los steps de todos los huevos
  // Implementación en 15_breeding.js — interactúa con el servidor
}
```

Esta mecánica incentiva capturar Pokémon para avanzar los huevos más rápido, creando sinergia entre sistemas.
