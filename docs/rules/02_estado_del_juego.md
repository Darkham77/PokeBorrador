# 🗂️ Estado del Juego (State & Stores)

En la nueva arquitectura, el estado global se gestiona mediante **Pinia**, distribuyendo la información en diferentes *stores* especializados. Sin embargo, se mantiene la estructura del objeto `state` original para compatibilidad con el motor de juego heredado en `src/legacy/js/`.

## Stores de Pinia
- **useGameStore**: Contiene el progreso del entrenador, equipo y mochila.
- **useMapStore**: Gestiona la ubicación, ciclos y encuentros.
- **useBattleStore**: Controla el estado efímero durante los combates.

---

## Objeto `state` — estructura completa (Legacy)

Este objeto se sincroniza automáticamente con los stores de Pinia:

```javascript
let state = {
  // Identidad
  trainer: 'ASH',              // Nombre del entrenador (string)

  // Progresión
  badges: 0,                   // Número de medallas (integer, 0–8)
  trainerLevel: 1,             // Nivel del entrenador (1–10)
  trainerExp: 0,               // EXP actual del entrenador
  trainerExpNeeded: 100,       // EXP necesaria para subir de rango
  defeatedGyms: [],            // IDs de gimnasios derrotados ['pewter', 'cerulean', ...]

  // Economía
  money: 3000,                 // Dinero (₽)
  battleCoins: 0,              // Monedas de batalla (para tienda especial)
  balls: 10,                   // Contador total de Pokéballs (se recalcula)

  // Pokémon
  team: [],                    // Equipo activo (máx. 6 objetos Pokemon)
  box: [],                     // Caja PC (máx. 100 Pokémon)
  eggs: [],                    // Huevos en incubación
  pokedex: [],                 // IDs de Pokémon vistos/capturados

  // Inventario
  inventory: {
    'Poción': 3,
    'Pokéball': 10,
    // ... cualquier ítem por nombre: cantidad
  },

  // Encuentros
  trainerChance: 5,            // % de probabilidad de encuentro con entrenador (5–20)
  lastWildLocId: null,         // Última zona salvaje visitada (para "Continuar explorando")

  // Batalla activa
  battle: null,                // Objeto BattleState (ver combate.md), null fuera de batalla

  // Flags de tiempo
  repelUntil: null,            // timestamp ms — bloquea encuentros salvajes
  shinyBoostUntil: null,       // timestamp ms — divide SHINY_RATE por 10
  amuletCoinUntil: null,       // timestamp ms — duplica el dinero ganado en batalla

  // Miscelánea
  starterChosen: false,        // true si ya eligió starter (evita volver a title-screen)

  // Estadísticas de partida
  stats: {
    battles: 0,
    wins: 0,
    trainersDefeated: 0,
  },
};
```

---

## Objeto Pokémon

Cada Pokémon en el equipo o caja sigue esta estructura:

```javascript
{
  uid: 'uuid-v4',              // Identificador único del ejemplar
  id: 'pikachu',               // ID de especie (clave en POKEMON_DB)
  name: 'Pikachu',             // Nombre de especie
  // ... stats, ivs, moves (ver detalles en 03_pokemon_y_stats.md)
}
```

---

## Serialización / Deserialización (Persistencia)

La persistencia ahora se maneja de forma centralizada. La lógica de guardado reside originalmente en `src/legacy/js/01_auth.js` pero es invocada por el sistema de sincronización de Vue:

1. **Auto-guardado**: Cada 60 segundos o tras acciones críticas vía `scheduleSave()`.
2. **Supabase**: Los datos se guardan en la tabla `game_saves` como JSON.
3. **Local**: Para partidas sin cuenta, se usa el `localStorage` del navegador.

> **⚠️ Campos NO persistidos:** `battle`, `trainerChance`, `lastWildLocId`, `repelUntil`, `shinyBoostUntil`, `amuletCoinUntil`.
> Estos estados se resetean al recargar la aplicación para evitar inconsistencias con el estado real del servidor.

---

## Migraciones y Compatibilidad

Al cargar una partida guardada desde el servidor, se aplican parches de compatibilidad definidos en `src/logic/pokemonData.js` o `src/legacy/js/01_auth.js`:

- Conversión de medallas (de array a número).
- Asignación de géneros y UIDs faltantes.
- Deduplicación de Pokémon en el equipo.
