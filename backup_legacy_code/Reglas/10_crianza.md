# 🏠 Sistema de Crianza (Guardería)

## Resumen del flujo

```
Jugador elige 2 Pokémon → verificar compatibilidad
    ↓
checkCompatibility(pA, pB) → { level: 0|1|2|3, eggSpecies, reason }
    ↓
Si level > 0: iniciar guardería
    ↓
Cada EGG_SPAWN_INTERVAL_MS[level]: generar huevo
    ↓
Huevo va a state.eggs con inherited_ivs calculados
    ↓
Explorar zonas decrementa steps del huevo (1 paso por click en goLocation)
    ↓
Cuando steps <= 0: egg.ready = true
    ↓
startManualHatch() → animación de clicks → performHatchRevelation()
    ↓
Pokémon nace con IVs heredados, nivel 5
```

---

## Compatibilidad

```javascript
function checkCompatibility(pA, pB) → { level, eggSpecies, reason }
```

### Niveles de compatibilidad

| Nivel | Texto | Color | Intervalo de huevo |
|---|---|---|---|
| 0 | ❌ Incompatibles | Rojo | Sin huevo |
| 1 | 😐 Poco interés | Naranja | (no usado actualmente) |
| 2 | 🙂 Compatibles | Verde | 9 horas |
| 3 | ❤️ Muy compatibles | Rosa | 6 horas |

```javascript
const EGG_SPAWN_INTERVAL_MS = {
  1: 12 * 60 * 60 * 1000,  // 12 horas (nivel 1, no activo)
  2:  9 * 60 * 60 * 1000,  // 9 horas
  3:  6 * 60 * 60 * 1000,  // 6 horas
};
```

### Reglas de compatibilidad

```
1. Si alguno tiene grupo "no-eggs" → Incompatible (reason: 'No se puede criar')
   Pokémon no-eggs: cleffa, igglybuff, pichu, elekid, magby, togepi, mew, mewtwo,
                   articuno, zapdos, moltres, nidorina, nidoqueen

2. Ditto + cualquier Pokémon válido → Compatibles (level 2)
   El huevo es la forma base del no-Ditto

3. Misma especie + diferente género → Muy compatibles (level 3)
   Misma especie + mismo género → Incompatible

4. Diferente especie + grupo huevo compartido → Compatibles (level 2)
   Sin grupo compartido → Incompatible

5. Ambos machos o ambas hembras (sin Ditto) → Incompatible

6. Legendarios (mewtwo, mew, articuno, zapdos, moltres) → Incompatible
```

### La madre define la especie del huevo

```javascript
// La madre es la hembra del par
const mother = aFemale ? pA : pB;
const eggSpecies = getBaseEvolution(_breedingBaseId(mother.id));
```

La función `getBaseEvolution` garantiza que el huevo sea siempre la forma base de la línea evolutiva:
```javascript
const evolutionBase = {
  ivysaur: 'bulbasaur', venusaur: 'bulbasaur',
  charmeleon: 'charmander', charizard: 'charmander',
  // ... etc.
}
```

---

## Grupos Huevo

Los grupos huevo definen qué Pokémon pueden criar entre sí. Un Pokémon puede tener hasta 2 grupos.

| Grupo | Ejemplos |
|---|---|
| monster | Bulbasaur, Squirtle, Charmander, Lapras, Snorlax |
| water1 | Squirtle, Poliwag, Psyduck, Horsea, Magikarp |
| water2 | Goldeen, Magikarp, Gyarados |
| water3 | Shellder, Staryu, Krabby, Omanyte |
| bug | Caterpie, Weedle, Paras, Venonat, Scyther |
| flying | Pidgey, Spearow, Doduo, Aerodactyl, Zubat |
| ground | Rattata, Meowth, Eevee, Mankey, Vulpix, Growlithe |
| fairy | Pikachu, Jigglypuff, Clefairy, Chansey |
| plant | Bulbasaur, Oddish, Exeggcute, Tangela |
| humanshape | Abra, Machop, Drowzee, Electabuzz, Jynx, Hitmonchan |
| mineral | Geodude, Magnemite, Graveler, Electrode, Onix |
| indeterminate | Gastly, Grimer, Koffing |
| dragon | Ekans, Horsea, Dratini, Gyarados, Charizard |
| ditto | Solo Ditto (se puede cruzar con cualquier grupo excepto no-eggs) |
| no-eggs | No puede criar (legendarios, bebés) |

---

## Herencia de IVs

```javascript
function calculateInheritance(pA, pB, heldItemA, heldItemB) {
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

  // 1. Determinar cuántos IVs se heredan
  const hasDestinyKnot = (heldItemA === 'Lazo Destino' || heldItemB === 'Lazo Destino');
  const count = hasDestinyKnot ? 5 : 3;  // Sin Lazo: 3 IVs; Con Lazo: 5 IVs

  // 2. Stat forzado por ítem de potencia
  const powerItems = {
    'Pesa Recia': 'hp',       'Brazal Potencia': 'atk',
    'Fajín Potencia': 'def',  'Lente Potencia': 'spa',
    'Banda Potencia': 'spd',  'Tobillera Potencia': 'spe'
  };
  // Si uno de los padres lleva ítem de potencia, ese stat es garantizado

  // 3. Los stats restantes se eligen al azar de los no forzados
  // Cada stat elegido hereda 50% del padre A, 50% del padre B

  // 4. Stats no heredados = aleatorio 0–31
}
```

### Probabilidades de herencia por stat (sin ítems, 3 IVs heredados)

Para cada uno de los 6 stats:
- Probabilidad de heredar de **padre A**: `(3/6) × 0.5 = 25%`
- Probabilidad de heredar de **padre B**: `(3/6) × 0.5 = 25%`
- Probabilidad de ser **aleatorio** (0–31): `50%`

### Con Lazo Destino (5 IVs heredados):
- Probabilidad de heredar de A: `(5/6) × 0.5 ≈ 41.7%`
- Probabilidad de heredar de B: `(5/6) × 0.5 ≈ 41.7%`
- Probabilidad de ser aleatorio: ≈ `16.7%`

### Con Lazo Destino + Ítem de Potencia:
- El stat del ítem: **100% garantizado** del portador
- Los 4 stats restantes: elegir 4 de 5 → probabilidad de heredar ≈ `(4/5) × 0.5 = 40%` cada uno

---

## Tasa Shiny en crianza

```javascript
// Shiny en huevo de crianza: siempre 1/512 (fijo, no usa SHINY_RATE)
// (El valor está hardcodeado en el summary de la guardería)
```

> Esto es diferente al 1/2000 de encuentros salvajes. La crianza da ~4× más probabilidad de shiny.

---

## Generación del Pokémon al eclosionar

```javascript
function performHatchRevelation(eggIdx) {
  const p = makePokemon(egg.pokemonId, 5);  // Nivel 5

  // Si es huevo de crianza: sobreescribir IVs con los heredados
  if (egg.origin === 'breeding') {
    if (egg.inherited_ivs) p.ivs = { ...egg.inherited_ivs };
    if (egg.isShiny !== undefined) p.isShiny = egg.isShiny;
  }

  // Agregar al equipo (o caja si equipo lleno)
  state.team.push(p);
  if (state.team.length > 6) {
    const moved = state.team.pop();
    state.box.push(moved);
  }
}
```

---

## Movimientos Huevo (Egg Moves)

Están definidos en `EGG_MOVES_DB` pero **actualmente no se implementan** al nacer el Pokémon. Es una mejora pendiente importante.

```javascript
const EGG_MOVES_DB = {
  bulbasaur:  ['leaf_storm', 'power_whip', 'ingrain'],
  charmander: ['dragon_rage', 'flare_blitz', 'dragon_dance'],
  squirtle:   ['aqua_jet', 'mirror_coat', 'water_spout'],
  pikachu:    ['volt_tackle', 'fake_out', 'encore'],
  eevee:      ['wish', 'synchronoise', 'detect'],
  meowth:     ['payday', 'hypnosis'],
  // ...
};
```

---

## Procesamiento offline de huevos de crianza

Al iniciar sesión online, se llama `processOfflineBreeding(userId)` que verifica cuánto tiempo pasó desde la última vez y genera huevos automáticamente según el tiempo transcurrido.

> Esta función procesa guardería offline para que los jugadores reciban los huevos que "les tocaban" mientras no estaban conectados.

---

## Límites del sistema

- **Máximo 1 huevo de encuentro** en incubación a la vez
- **Máximo 1 huevo de crianza** en incubación a la vez
- Pasos por huevo: **150 a 300** (aleatorio al crearse)
- Los pasos se decrementan **1 por cada click en goLocation()**
