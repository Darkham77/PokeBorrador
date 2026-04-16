# 🗂️ Estado del Juego (State)

## Objeto `state` — estructura completa

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

Cada Pokémon en `state.team` o `state.box` sigue esta estructura:

```javascript
{
  uid: 'uuid-v4',              // Identificador único del ejemplar
  id: 'pikachu',               // ID de especie (clave en POKEMON_DB)
  name: 'Pikachu',             // Nombre de especie
  emoji: '⚡',                 // Emoji de respaldo si no carga sprite
  type: 'electric',            // Tipo primario
  // type2 se obtiene de POKE_TYPE2[id] en runtime

  level: 25,
  exp: 0,
  expNeeded: 15625,            // EXP para el siguiente nivel

  // IVs — valor entero 0–31 para cada stat
  ivs: { hp: 18, atk: 22, def: 15, spa: 20, spd: 14, spe: 31 },

  nature: 'Tímido',            // Uno de los 20 NATURES
  ability: 'Electricidad Estática',
  gender: 'M',                 // 'M', 'F', o null (asexuado)
  isShiny: false,

  // Stats calculados (se recalculan con recalcPokemonStats)
  maxHp: 87,
  hp: 87,                      // HP actual
  atk: 45,
  def: 40,
  spa: 50,
  spd: 50,
  spe: 90,

  // Movimientos (máx. 4)
  moves: [
    { name: 'Impactrueno', pp: 30, maxPP: 30 },
    { name: 'Ataque Rápido', pp: 30, maxPP: 30 },
    { name: 'Cola', pp: 30, maxPP: 30 },
    { name: 'Rayo', pp: 15, maxPP: 15 },
  ],

  // Estado en batalla (se resetea entre batallas)
  status: null,                // null | 'burn' | 'poison' | 'paralyze' | 'sleep' | 'freeze'
  sleepTurns: 0,
  confused: 0,                 // Turnos de confusión restantes
  flinched: false,

  // Equipable
  heldItem: null,              // Nombre del ítem equipado
  choiceMove: null,            // Para Cinta Elegida — movimiento bloqueado

  // Crianza
  friendship: 70,

  // Combate
  lastPhysDmg: 0,              // Último daño físico recibido (para Contraataque)
  seeded: false,               // Bajo efecto de Drenadoras
}
```

---

## Serialización / Deserialización

La función `serializeState()` en `01_auth.js` define exactamente qué campos se persisten:

```javascript
function serializeState() {
  return {
    trainer, badges, balls, money, battleCoins,
    eggs, trainerLevel, trainerExp, trainerExpNeeded,
    inventory, team, box, pokedex, defeatedGyms,
    starterChosen, stats,
  };
}
```

> **⚠️ Campos NO persistidos:** `battle`, `trainerChance`, `lastWildLocId`,
> `repelUntil`, `shinyBoostUntil`, `amuletCoinUntil`.
> Los boosters temporales se pierden al cerrar sesión. `trainerChance` se resetea a 5 al iniciar sesión.

---

## Objeto Huevo

```javascript
{
  id: Date.now() + Math.random(),  // ID único
  pokemonId: 'pichu',              // Especie que eclosionará
  steps: 200,                      // Pasos restantes (decrece con goLocation())
  totalSteps: 200,                 // Pasos iniciales (para calcular % de progreso)
  name: 'Huevo de Encuentro',      // o 'Huevo de Crianza'
  origin: 'encounter',             // 'encounter' | 'breeding'
  ready: false,                    // true cuando steps <= 0
  // Solo en huevos de crianza:
  inherited_ivs: { hp, atk, def, spa, spd, spe },
  isShiny: false,
}
```

---

## Migraciones y compatibilidad hacia atrás

Al cargar una partida guardada, el código aplica parches de migración:

```javascript
// badges era array en versiones antiguas → convertir a número
if (Array.isArray(state.badges)) state.badges = state.badges.length;

// Pokémon sin uid → asignar uid nuevo
if (state.team) state.team.forEach(p => { if (!p.uid) p.uid = getUidStr(); });

// Pokémon sin gender → asignar género
state.team.forEach(p => ensurePokemonGender(p));

// Pokémon duplicados por uid → deduplicar
state.team = _dedupeByUid(state.team);

// trainerChance siempre se resetea a 5 al login
state.trainerChance = 5;
```
