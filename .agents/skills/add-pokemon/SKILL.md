---
name: add-pokemon
description: Guía paso a paso para agregar un Pokémon completamente nuevo al juego. Incluye stats, learnset Gen 3 desde PokeAPI, habilidades, evoluciones, compatibilidad de MTs y entrada en la Pokédex. Ejecutar el script `fetch_pokemon.js` para obtener los datos automáticamente.
---

# Skill: Agregar un Pokémon Nuevo al Juego

## Prerequisitos

- Tener Node.js disponible para ejecutar el script de fetch.
- Los validators de movimientos y habilidades ya deben existir en `.agents/skills/`.

---

## 🚨 REGLA DE ORO: INTEGRIDAD DE DATOS

Antes de agregar cualquier dato nuevo, recuerda:

1. **Nombres de Objetos**: Usa siempre los nombres oficiales completos. Ejemplo: **"Subida de PP"** (NO "Subida PP"). Una discrepancia romperá la lógica de uso.
2. **Deduplicación**: Nunca agregues un movimiento a `MOVE_DATA` que ya exista. El validador ahora detecta duplicados automáticamente.
3. **Sincronización de PP**: Al inicializar un movimiento para un Pokémon, `maxPP` debe ser igual a su `pp` base inicial.

---

## Paso 0: Obtener todos los datos desde PokeAPI

Ejecutar el script de fetch pasando el nombre en inglés del Pokémon:

```bash
node .agents/skills/add-pokemon/fetch_pokemon.js houndour
```

Esto genera un archivo `_output/<pokemon>.json` con todos los datos necesarios.

---

## Paso 1: Agregar a `POKEMON_DB` en `js/02_pokemon_data.js`

### Formato exacto del proyecto

```js
houndour: {
  name: 'Houndour', emoji: '🔥', type: 'fire',
  hp: 45, atk: 60, def: 30, spa: 80, spd: 50, spe: 65,
  learnset: [
    { lv: 1, name: 'Lanzamiento', pp: 35 },
    { lv: 1, name: 'Gruñido', pp: 40 },
    { lv: 7, name: 'Ascuas', pp: 25 },
    { lv: 13, name: 'Mordisco', pp: 25 },
    { lv: 19, name: 'Rugido', pp: 20 },
    { lv: 25, name: 'Colmillo Ígneo', pp: 15 },
    { lv: 31, name: 'Rastreo', pp: 30 },
    { lv: 37, name: 'Lanzallamas', pp: 15 },
    { lv: 43, name: 'Infierno', pp: 5 },
    { lv: 50, name: 'Llamarada', pp: 5 }
  ]
},
houndoom: {
  name: 'Houndoom', emoji: '🔥', type: 'fire',
  hp: 75, atk: 90, def: 50, spa: 110, spd: 80, spe: 95,
  learnset: [
    { lv: 1, name: 'Lanzamiento', pp: 35 },
    { lv: 1, name: 'Gruñido', pp: 40 },
    { lv: 1, name: 'Ascuas', pp: 25 },
    { lv: 1, name: 'Mordisco', pp: 25 },
    // ... continúa
  ]
},
```

### Reglas

- La key es siempre en **inglés en minúsculas** (ej. `houndour`, `mr_mime`).
- El `name` es en **español** o nombre oficial del juego.
- El `emoji` es decorativo, elegir el más representativo del tipo.
- El `type` es en **inglés en minúsculas** (`fire`, `dark`, etc). Para tipo secundario, revisar si el proyecto usa `POKE_TYPE2` separado.
- Stats base tomados de PokeAPI Gen 3 (o Bulbapedia).
- El learnset usa **nombres en español** tal como están en `MOVE_DATA`.

> [!IMPORTANT]
> Los movimientos del learnset DEBEN existir en `MOVE_DATA` (en `js/02_pokemon_data.js`). Antes de agregar el Pokémon, verificar cada movimiento. Si alguno falta, agrégalo a `MOVE_DATA` primero.

---

## Paso 2: Agregar tipo secundario en `POKE_TYPE2` (si aplica)

Buscar la constante `POKE_TYPE2` en el proyecto:

```bash
grep -n "POKE_TYPE2" js/02_pokemon_data.js
```

Si el Pokémon tiene dos tipos, agregar la entrada:

```js
houndour: 'dark',   // tipo secundario = dark
houndoom: 'dark',
```

---

## Paso 3: Agregar habilidades en `ABILITIES` en `js/04_state.js`

### Formato exacto

```js
houndour: ['Espíritu Vital', 'Inicio Rápido'],
houndoom: ['Espíritu Vital', 'Inicio Rápido'],
```

### Reglas

- Los nombres de habilidades están en **español**, exactamente como en `ABILITY_DATA`.
- Si es una habilidad **nueva** que no está en `ABILITY_DATA`, hay que agregarla:

#### 3a. Agregar descripción en `ABILITY_DATA` (`js/02_pokemon_data.js`)

```js
'Inicio Rápido': 'Duplica la Velocidad cuando el Pokémon tiene un estado alterado.',
```

#### 3b. Si la habilidad tiene efecto en batalla, implementarla en `js/07_battle.js`

Usar el validator de habilidades para verificar que esté correctamente implementada:

```bash
# Eliminar caché para refrescar con la nueva habilidad
del .agents\skills\pokemon-ability-validator\pokeapi_ability_cache.json
node .agents/skills/pokemon-ability-validator/validator.js
```

---

## Paso 4: Agregar evolución en `js/13_evolution.js`

### Para evolución por nivel

Agregar en `EVOLUTION_TABLE`:

```js
houndour: { level: 24, to: 'houndoom' },
```

### Para evolución por piedra

Agregar en `STONE_EVOLUTIONS`:

```js
nombrePokemon: { stone: 'Piedra Fuego', to: 'nombreEvolución' },
```

### Para evolución por intercambio

Agregar en `TRADE_EVOLUTIONS`:

```js
nombrePokemon: 'nombreEvolución',
```

---

## Paso 5: Agregar número de sprite y orden en Pokédex (`js/18_pokedex.js`)

### 5a. Agregar en `POKEMON_SPRITE_IDS`

```js
houndour: 228, houndoom: 229,
```

El número es el **ID nacional de la Pokédex** oficial.

### 5b. Agregar en `PDEX_ORDER` (el array de orden de visualización)

```js
// Agregar en la posición correcta según el número nacional
'houndour', 'houndoom',
```

> [!WARNING]
> Si el Pokémon es de Gen 2+ y el juego originalmente solo tenía Gen 1, insertar al final del array `PDEX_ORDER`, antes de los legendarios si corresponde.

---

## Paso 6: Agregar compatibilidad de MTs en `TM_COMPAT` (`js/18_pokedex.js`)

Consultar la compatibilidad oficial en PokeAPI o Bulbapedia Gen 3 y agregar:

```js
houndour: ['TM06','TM10','TM11','TM12','TM17','TM21','TM23','TM27','TM28','TM30','TM32','TM35','TM36','TM38','TM41','TM42','TM43','TM44','TM45','TM46','TM49','TM50'],
houndoom: ['TM05','TM06','TM10','TM11','TM12','TM15','TM17','TM21','TM23','TM27','TM28','TM30','TM32','TM35','TM36','TM38','TM41','TM42','TM43','TM44','TM45','TM46','TM49','TM50'],
```

El ID de la MT debe estar en `GAME_TMS`. Si la MT no existe en el juego, **no agregarla**.

---

## Paso 7: Verificar que todos los movimientos están implementados

Ejecutar el validator de movimientos:

```bash
node .agents/skills/pokemon-move-validator/validator.js
```

Si aparece algún movimiento del learnset que no tiene implementación (`❌`), agregarlo a `MOVE_DATA` en `js/02_pokemon_data.js`.

Formato de un movimiento en `MOVE_DATA`:

```js
'Colmillo Ígneo': { type: 'fire', cat: 'physical', power: 65, acc: 95, pp: 15, effect: 'burn_10' },
'Infierno':       { type: 'fire', cat: 'special',  power: 100, acc: 85, pp: 5, effect: 'burn' },
```

---

## Paso 8: Agregar al mapa/encuentros (opcional)

Si el Pokémon debe poder encontrarse salvaje, buscarlo en los archivos de ubicaciones:

```bash
grep -rn "encounters\|wildPokemon\|LOCATION" js/ --include="*.js" | head -20
```

Agregar el Pokémon a la ubicación que corresponda según el lore del juego.

---

## Checklist Final

Antes de dar por terminado, verificar cada ítem:

- `[ ]` Entrada en `POKEMON_DB` con stats, emoji, tipo y learnset completo
- `[ ]` Tipo secundario en `POKE_TYPE2` (si aplica)
- `[ ]` Habilidades en `ABILITIES` con nombres correctos en español
- `[ ]` Descripción de habilidades nuevas en `ABILITY_DATA`
- `[ ]` Lógica de batalla de habilidades nuevas en `07_battle.js`
- `[ ]` Evolución en `EVOLUTION_TABLE`, `STONE_EVOLUTIONS` o `TRADE_EVOLUTIONS`
- `[ ]` Número sprite en `POKEMON_SPRITE_IDS`
- `[ ]` Posición en `PDEX_ORDER`
- `[ ]` Compatibilidad de MTs en `TM_COMPAT`
- `[ ]` Todos los movimientos del learnset existen en `MOVE_DATA`
- `[ ]` Validator de movimientos ejecutado sin errores (ni movimientos faltantes ni duplicados)
- `[ ]` Validator de habilidades ejecutado sin errores nuevos
- `[ ]` Nombres de movimientos e ítems verificados contra el estándar (ej. "Subida de PP")
- `[ ]` **Persistencia verificada**: El Pokémon inyectado sobrevive a un refresco de página (F5)

---

## Paso 9: Inyección y Prueba (REAL vs TEST)

Una vez insertado el código en los archivos del proyecto, puedes probar el Pokémon inmediatamente inyectándolo en tu caja.

El script `fetch_pokemon.js` genera dos snippets en el archivo `_code.txt`:

1. **OPCIÓN A (REAL):** Crea un Pokémon con **stats naturales** (IVs aleatorios, Naturaleza aleatoria, movimientos según nivel). Recomendado para balanceo y gameplay.

    ```js
    injectPokemonToBox(makePokemon('nombre', 50));
    ```

2. **OPCIÓN B (TEST):** Crea un Pokémon con **datos ficticios** (IVs perfectos, stats personalizados, shiny). Recomendado para pruebas visuales o de depuración.

> [!CAUTION]
> Asegúrate de estar logueado en el juego antes de ejecutar los snippets en la consola.

---

## Paso 10: Verificación de Persistencia

El sistema utiliza un nuevo `DBRouter` que sincroniza con Supabase y SQLite. Para confirmar que el Pokémon es persistente:

1. Inyecta el Pokémon usando el snippet.
2. Espera a que aparezca la notificación 📥.
3. **Refresca la página (F5)**.
4. Entra a la Caja PC. Si el Pokémon sigue ahí, la persistencia es correcta.

Si desaparece, significa que el guardado falló o que el "Conflicto de Versiones" sobreescribió tu progreso local. Verifica que `window.lastLoadTime` se esté actualizando correctamente en `01_auth.js`.

---

## Referencias

- **PokeAPI:** `https://pokeapi.co/api/v2/pokemon/<id_o_nombre>`
- **Learnset Gen 3:** `https://pokeapi.co/api/v2/pokemon/<id>/` → `moves[].version_group_details` donde `version_group.name = "firered-leafgreen"`
- **Stats:** `https://pokeapi.co/api/v2/pokemon/<id>/` → `stats[]`
- **Habilidades:** `https://pokeapi.co/api/v2/pokemon/<id>/` → `abilities[]`
- **TM Compat Gen 3:** Bulbapedia o `https://pokeapi.co/api/v2/pokemon/<id>/` → `moves[]` donde `move_learn_method.name = "machine"`
